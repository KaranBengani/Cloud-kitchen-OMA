import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, type EntityManager, In, MoreThanOrEqual, Not } from 'typeorm';
import { todayIST } from '../common/today.js';
import { addressSnapshot, findOrCreateCustomer, saveAddress } from '../customers/address-book.js';
import { Customer } from '../customers/customer.entity.js';
import { HolidaysService, holidayOn } from '../holidays/holidays.service.js';
import { MenuItem } from '../menu/menu-item.entity.js';
import type {
  CreateOrderDto,
  OrderInput,
  PaymentInput,
  UpdateOrderDto,
  UpdateStatusDto,
  WebOrderDto,
} from './order.dto.js';
import { OrderItem } from './order-item.entity.js';
import { OPEN_BALANCE, Order, type OrderStatus } from './order.entity.js';
import { Payment } from './payment.entity.js';
import { priceOrder } from './pricing.js';

// What the app receives: the order plus money figures it would otherwise have to compute itself.
export type OrderView = Order & { subtotalPaise: number; balancePaise: number };

export interface DueRow {
  orderId: number;
  deliveryDate: string;
  status: string;
  customerId: number;
  customerName: string;
  customerPhone: string | null;
  totalPaise: number;
  paidPaise: number;
  balancePaise: number;
}

// What the customer's page gets back after placing an order.
export interface WebOrderReceipt {
  orderId: number;
  totalPaise: number;
}

// Which status changes the app may make. Requests (web orders) are accepted or declined first;
// declined is final. Everything else moves freely, as before (e.g. reopening a cancelled order).
const ALLOWED_FROM: Partial<Record<OrderStatus, OrderStatus[]>> = {
  requested: ['booked', 'declined'],
  declined: [],
};

// Backstop on top of the per-network rate limit: a burst of web orders from many networks at once
// is almost certainly abuse, not customers.
const WEB_ORDERS_PER_HOUR = 30;

@Injectable()
export class OrdersService {
  private webOrderTimes: number[] = [];

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly holidays: HolidaysService,
  ) {}

  // Upcoming by default (today onwards, IST), or a date range for the calendar.
  // Web requests and declined orders aren't part of the kitchen's plan, so they're left out here;
  // requests have their own list.
  async list(from?: string, to?: string): Promise<OrderView[]> {
    const start = from ?? todayIST();
    const orders = await this.db.getRepository(Order).find({
      where: {
        deliveryDate: to ? Between(start, to) : MoreThanOrEqual(start),
        status: Not(In(['requested', 'declined'])),
      },
      // TypeORM 1.x: relations are an object, not a string array.
      relations: { customer: true, items: true, payments: true },
      order: {
        deliveryDate: 'ASC',
        deliveryTime: { direction: 'ASC', nulls: 'LAST' },
        id: 'ASC',
      },
    });
    return orders.map(toView);
  }

  // Web orders waiting for the parents' decision, oldest first, whatever their date.
  async requests(): Promise<OrderView[]> {
    const orders = await this.db.getRepository(Order).find({
      where: { status: 'requested' },
      relations: { customer: true, items: true, payments: true },
      order: { createdAt: 'ASC' },
    });
    return orders.map(toView);
  }

  async get(id: number, manager: EntityManager = this.db.manager): Promise<OrderView> {
    const order = await manager.getRepository(Order).findOne({
      where: { id },
      relations: { customer: true, items: true, payments: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return toView(order);
  }

  // Order, items and advance are written in ONE transaction: either the whole order exists or none of it.
  // Spring equivalent: a @Transactional service method.
  create(dto: CreateOrderDto): Promise<OrderView> {
    return this.db.transaction(async (tx) => {
      await this.assertCustomer(tx, dto.customerId);
      const { lines, discountPaise, totalPaise } = await this.buildLines(tx, dto);

      const order = await tx.getRepository(Order).save(
        tx.getRepository(Order).create({
          ...(await this.orderFields(tx, dto)),
          discountPaise,
          totalPaise,
          status: 'booked',
          version: 1,
        }),
      );
      await tx.getRepository(OrderItem).insert(lines.map((l) => ({ ...l, orderId: order.id })));
      if (dto.advance)
        await this.insertPayment(tx, order.id, {
          isAdvance: true,
          ...dto.advance,
        });

      return this.get(order.id, tx);
    });
  }

  replace(id: number, dto: UpdateOrderDto): Promise<OrderView> {
    return this.db.transaction(async (tx) => {
      await this.assertCustomer(tx, dto.customerId);
      const previous = await tx.getRepository(OrderItem).findBy({ orderId: id });
      const { lines, discountPaise, totalPaise } = await this.buildLines(tx, dto, previous);

      await this.updateWithVersion(tx, id, dto.version, {
        ...(await this.orderFields(tx, dto)),
        discountPaise,
        totalPaise,
      });
      // Replace all lines: simpler than diffing, and safe because we hold the order's row lock
      // (taken by the UPDATE above) until this transaction commits.
      await tx.getRepository(OrderItem).delete({ orderId: id });
      await tx.getRepository(OrderItem).insert(lines.map((l) => ({ ...l, orderId: id })));

      return this.get(id, tx);
    });
  }

  setStatus(id: number, dto: UpdateStatusDto): Promise<OrderView> {
    return this.db.transaction(async (tx) => {
      const current = await tx.getRepository(Order).findOne({ where: { id }, select: { id: true, status: true } });
      if (!current) throw new NotFoundException(`Order ${id} not found`);
      const allowed = ALLOWED_FROM[current.status];
      if (dto.status === 'declined' ? current.status !== 'requested' : allowed && !allowed.includes(dto.status)) {
        throw new BadRequestException(`An order that is ${current.status} can't be changed to ${dto.status}`);
      }
      // The version check still catches someone else changing the status in between.
      await this.updateWithVersion(tx, id, dto.version, { status: dto.status });
      return this.get(id, tx);
    });
  }

  // Payments don't bump the order version: two people recording two real payments at once
  // is not a conflict, both should be kept.
  addPayment(orderId: number, dto: PaymentInput): Promise<OrderView> {
    return this.db.transaction(async (tx) => {
      if (!(await tx.getRepository(Order).existsBy({ id: orderId }))) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }
      await this.insertPayment(tx, orderId, dto);
      return this.get(orderId, tx);
    });
  }

  deletePayment(orderId: number, paymentId: number): Promise<OrderView> {
    return this.db.transaction(async (tx) => {
      // RETURNING gives back the deleted amount, so paid_paise can be reduced by exactly that.
      const [rows]: [{ amount_paise: number }[], number] = await tx.query(
        `DELETE FROM payments WHERE id = $1 AND order_id = $2 RETURNING amount_paise`,
        [paymentId, orderId],
      );
      if (!rows.length) throw new NotFoundException(`Payment ${paymentId} not found on order ${orderId}`);
      await this.adjustPaid(tx, orderId, -rows[0].amount_paise);
      return this.get(orderId, tx);
    });
  }

  // A customer's order from the menu link (DECISIONS.md D19). It arrives as 'requested': nothing is
  // promised until the parents accept it in the app. Customer and address are matched by phone and
  // address text, so a returning customer never becomes a second row.
  async createWebOrder(dto: WebOrderDto): Promise<WebOrderReceipt> {
    this.checkWebOrderRate();
    const today = todayIST();
    const latest = new Date(`${today}T00:00:00Z`);
    latest.setUTCDate(latest.getUTCDate() + 60);
    if (dto.deliveryDate < today || dto.deliveryDate > latest.toISOString().slice(0, 10)) {
      throw new BadRequestException('Pick a date between today and the next two months');
    }
    if (holidayOn(await this.holidays.upcoming(), dto.deliveryDate)) {
      throw new BadRequestException('The kitchen is closed on that date. Please pick another day.');
    }

    return this.db.transaction(async (tx) => {
      // Only items customers can see on the menu: available and not deleted (soft-deleted rows are
      // excluded from find() by default).
      const ids = [...new Set(dto.items.map((i) => i.menuItemId))];
      const available = await tx.getRepository(MenuItem).find({ where: { id: In(ids), isAvailable: true } });
      if (available.length !== ids.length) {
        throw new BadRequestException('Some items are no longer on the menu. Please reload the page.');
      }

      const customer = await findOrCreateCustomer(tx, dto.name, dto.phone);
      const delivery = dto.fulfilment === 'parcel' && dto.address ? dto.address : null;
      const addressId = delivery ? await saveAddress(tx, customer.id, delivery) : null;
      const { lines, totalPaise } = await this.buildLines(tx, {
        items: dto.items,
      });

      const order = await tx.getRepository(Order).save(
        tx.getRepository(Order).create({
          customerId: customer.id,
          deliveryDate: dto.deliveryDate,
          deliveryTime: dto.deliveryTime ?? null,
          fulfilment: dto.fulfilment,
          address: delivery ? addressSnapshot(delivery) : null,
          addressId,
          notes: dto.notes?.trim() || null,
          requestedName: customer.nameDiffers ? dto.name.trim() : null,
          source: 'web',
          status: 'requested',
          discountPaise: 0,
          totalPaise,
          version: 1,
        }),
      );
      await tx.getRepository(OrderItem).insert(lines.map((l) => ({ ...l, orderId: order.id })));
      return { orderId: order.id, totalPaise };
    });
  }

  private checkWebOrderRate() {
    const hourAgo = Date.now() - 3_600_000;
    this.webOrderTimes = this.webOrderTimes.filter((t) => t > hourAgo);
    if (this.webOrderTimes.length >= WEB_ORDERS_PER_HOUR) {
      throw new HttpException('Too many orders right now. Please call or WhatsApp us.', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.webOrderTimes.push(Date.now());
  }

  // Who owes money, and who we owe. Reads only orders in the IDX_orders_open_balance partial index,
  // so it stays fast however many settled orders accumulate:
  // - Active orders with a balance > 0: the customer owes us.
  // - Cancelled orders with money still paid on them: a refund is due (balancePaise is negative).
  //   Recording the refund as a negative payment brings paid to 0 and drops the row.
  async dues(): Promise<DueRow[]> {
    const rows: Record<string, unknown>[] = await this.db.query(`
      -- ::text keeps the date as '2026-11-14'. Without it the pg driver turns DATE into a JS Date at
      -- local midnight, which serialises as the previous day in UTC.
      SELECT o.id AS order_id, o.delivery_date::text AS delivery_date, o.status, o.total_paise, o.paid_paise,
             c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      -- Same condition as the index (OPEN_BALANCE in order.entity.ts), so Postgres can use it.
      WHERE ${OPEN_BALANCE.replaceAll('"', '')}
      ORDER BY o.delivery_date ASC, o.id ASC
    `);
    return rows.map((r) => ({
      orderId: r.order_id as number,
      deliveryDate: r.delivery_date as string,
      status: r.status as string,
      customerId: r.customer_id as number,
      customerName: r.customer_name as string,
      customerPhone: r.customer_phone as string | null,
      totalPaise: r.total_paise as number,
      paidPaise: r.paid_paise as number,
      balancePaise:
        r.status === 'cancelled' ? -(r.paid_paise as number) : (r.total_paise as number) - (r.paid_paise as number),
    }));
  }

  // Optimistic locking (DECISIONS.md D6): the WHERE on version makes "check and write" one atomic
  // statement. TypeORM's @VersionColumn alone wouldn't stop a stale save, so this is explicit.
  private async updateWithVersion(
    tx: EntityManager,
    id: number,
    version: number,
    fields: Partial<Order>,
  ): Promise<void> {
    const result = await tx
      .createQueryBuilder()
      .update(Order)
      .set({ ...fields, version: () => 'version + 1' })
      .where('id = :id AND version = :version', { id, version })
      .execute();

    if (result.affected === 0) {
      const exists = await tx.getRepository(Order).existsBy({ id });
      if (!exists) throw new NotFoundException(`Order ${id} not found`);
      throw new ConflictException('This order was changed by someone else. Reload to see their changes.');
    }
  }

  // Snapshots name, unit and price from the menu (DECISIONS.md D7). When editing, lines that were
  // already on the order keep their original menu price, so a menu price change since booking
  // doesn't silently reprice an existing order. Custom lines (no menuItemId, D14) use what was typed.
  private async buildLines(
    tx: EntityManager,
    dto: Pick<OrderInput, 'items' | 'discountPaise'>,
    previous: OrderItem[] = [],
  ) {
    const ids = [...new Set(dto.items.flatMap((i) => (i.menuItemId == null ? [] : [i.menuItemId])))];
    // withDeleted: an item removed from the menu can still appear on an order booked before that.
    const menu = ids.length ? await tx.getRepository(MenuItem).find({ where: { id: In(ids) }, withDeleted: true }) : [];
    const byId = new Map(menu.map((m) => [m.id, m]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length) throw new BadRequestException(`Unknown menu items: ${missing.join(', ')}`);

    const previousPrice = new Map(previous.map((p) => [p.menuItemId, p.menuPricePaise]));
    // Name, unit and menu price for each line, from the menu or from the custom line itself.
    const sources = dto.items.map((i) => {
      if (i.menuItemId == null) {
        return {
          menuItemId: null,
          name: i.name!.trim(),
          unit: i.unit!,
          menuPricePaise: i.unitPricePaise!,
        };
      }
      const item = byId.get(i.menuItemId)!;
      const menuPricePaise = previousPrice.get(item.id) ?? item.pricePaise;
      return {
        menuItemId: item.id,
        name: item.name,
        unit: item.unit,
        menuPricePaise,
      };
    });

    let priced;
    try {
      priced = priceOrder(
        dto.items.map((i, index) => ({
          qty: i.qty,
          menuPricePaise: sources[index].menuPricePaise,
          unitPricePaise: i.unitPricePaise,
        })),
        dto.discountPaise ?? 0,
      );
    } catch (error) {
      if (error instanceof RangeError) throw new BadRequestException(error.message);
      throw error;
    }

    return {
      discountPaise: priced.discountPaise,
      totalPaise: priced.totalPaise,
      lines: priced.lines.map((l, index) => {
        const { menuItemId, name, unit } = sources[index];
        return { ...l, menuItemId, name, unit, sortOrder: index };
      }),
    };
  }

  // A parcel address is also saved to the customer's address book (or matched to an existing entry),
  // and the order points at that entry. The text is still copied onto the order (see Order.address).
  private async orderFields(tx: EntityManager, dto: OrderInput) {
    const address = dto.fulfilment === 'parcel' ? dto.address?.trim() || null : null;
    const addressId = address
      ? await saveAddress(tx, dto.customerId, {
          address,
          label: dto.addressLabel,
        })
      : null;
    return {
      customerId: dto.customerId,
      deliveryDate: dto.deliveryDate,
      deliveryTime: dto.deliveryTime ?? null,
      fulfilment: dto.fulfilment,
      address,
      addressId,
      notes: dto.notes ?? null,
    };
  }

  private async assertCustomer(tx: EntityManager, id: number) {
    if (!(await tx.getRepository(Customer).existsBy({ id }))) {
      throw new BadRequestException(`Customer ${id} not found`);
    }
  }

  // Always called inside a transaction, so the payment row and the order's paid_paise change together.
  private async insertPayment(tx: EntityManager, orderId: number, dto: PaymentInput) {
    await tx.getRepository(Payment).insert({
      orderId,
      amountPaise: dto.amountPaise,
      mode: dto.mode,
      paidOn: dto.paidOn ?? todayIST(),
      isAdvance: dto.isAdvance ?? false,
      note: dto.note ?? null,
    });
    await this.adjustPaid(tx, orderId, dto.amountPaise);
  }

  // "paid_paise + $1" in SQL, not read-add-write in JS: two payments saved at the same moment
  // can't overwrite each other's total.
  private adjustPaid(tx: EntityManager, orderId: number, deltaPaise: number) {
    return tx.query(`UPDATE orders SET paid_paise = paid_paise + $1 WHERE id = $2`, [deltaPaise, orderId]);
  }
}

function toView(order: Order): OrderView {
  order.items.sort((a, b) => a.sortOrder - b.sortOrder);
  order.payments.sort((a, b) => a.paidOn.localeCompare(b.paidOn) || a.id - b.id);
  const subtotalPaise = order.totalPaise + order.discountPaise;
  // Cancelled orders owe nothing, whatever was paid.
  const balancePaise = order.status === 'cancelled' ? 0 : order.totalPaise - order.paidPaise;
  return Object.assign(order, { subtotalPaise, balancePaise });
}
