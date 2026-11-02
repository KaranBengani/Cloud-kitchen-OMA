import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, type EntityManager, In, MoreThanOrEqual } from 'typeorm';
import { todayIST } from '../common/today.js';
import { Customer } from '../customers/customer.entity.js';
import { MenuItem } from '../menu/menu-item.entity.js';
import type { CreateOrderDto, OrderInput, PaymentInput, UpdateOrderDto, UpdateStatusDto } from './order.dto.js';
import { OrderItem } from './order-item.entity.js';
import { Order } from './order.entity.js';
import { Payment } from './payment.entity.js';
import { priceOrder } from './pricing.js';

// What the app receives: the order plus money figures it would otherwise have to compute itself.
export type OrderView = Order & { subtotalPaise: number; paidPaise: number; balancePaise: number };

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

@Injectable()
export class OrdersService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // Upcoming by default (today onwards, IST), or a date range for the calendar.
  async list(from?: string, to?: string): Promise<OrderView[]> {
    const start = from ?? todayIST();
    const orders = await this.db.getRepository(Order).find({
      where: { deliveryDate: to ? Between(start, to) : MoreThanOrEqual(start) },
      // TypeORM 1.x: relations are an object, not a string array.
      relations: { customer: true, items: true, payments: true },
      order: { deliveryDate: 'ASC', deliveryTime: { direction: 'ASC', nulls: 'LAST' }, id: 'ASC' },
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
          ...this.orderFields(dto),
          discountPaise,
          totalPaise,
          status: 'booked',
          version: 1,
        }),
      );
      await tx.getRepository(OrderItem).insert(lines.map((l) => ({ ...l, orderId: order.id })));
      if (dto.advance) await this.insertPayment(tx, order.id, { isAdvance: true, ...dto.advance });

      return this.get(order.id, tx);
    });
  }

  replace(id: number, dto: UpdateOrderDto): Promise<OrderView> {
    return this.db.transaction(async (tx) => {
      await this.assertCustomer(tx, dto.customerId);
      const previous = await tx.getRepository(OrderItem).findBy({ orderId: id });
      const { lines, discountPaise, totalPaise } = await this.buildLines(tx, dto, previous);

      await this.updateWithVersion(tx, id, dto.version, { ...this.orderFields(dto), discountPaise, totalPaise });
      // Replace all lines: simpler than diffing, and safe because we hold the order's row lock
      // (taken by the UPDATE above) until this transaction commits.
      await tx.getRepository(OrderItem).delete({ orderId: id });
      await tx.getRepository(OrderItem).insert(lines.map((l) => ({ ...l, orderId: id })));

      return this.get(id, tx);
    });
  }

  setStatus(id: number, dto: UpdateStatusDto): Promise<OrderView> {
    return this.db.transaction(async (tx) => {
      await this.updateWithVersion(tx, id, dto.version, { status: dto.status });
      return this.get(id, tx);
    });
  }

  // Payments don't bump the order version: two people recording two real payments at once
  // is not a conflict, both should be kept.
  async addPayment(orderId: number, dto: PaymentInput): Promise<OrderView> {
    await this.get(orderId);
    await this.insertPayment(this.db.manager, orderId, dto);
    return this.get(orderId);
  }

  async deletePayment(orderId: number, paymentId: number): Promise<OrderView> {
    const result = await this.db.getRepository(Payment).delete({ id: paymentId, orderId });
    if (!result.affected) throw new NotFoundException(`Payment ${paymentId} not found on order ${orderId}`);
    return this.get(orderId);
  }

  // Who owes money: aggregated in SQL rather than loading every order into memory.
  // Cancelled orders are excluded; an advance kept on a cancelled order isn't a debt.
  async dues(): Promise<DueRow[]> {
    const rows: Record<string, unknown>[] = await this.db.query(`
      -- ::text keeps the date as '2026-11-14'. Without it the pg driver turns DATE into a JS Date at
      -- local midnight, which serialises as the previous day in UTC.
      SELECT o.id AS order_id, o.delivery_date::text AS delivery_date, o.status, o.total_paise,
             c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone,
             COALESCE(SUM(p.amount_paise), 0)::int AS paid_paise
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.status <> 'cancelled'
      GROUP BY o.id, c.id
      HAVING o.total_paise - COALESCE(SUM(p.amount_paise), 0) > 0
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
      balancePaise: (r.total_paise as number) - (r.paid_paise as number),
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
  private async buildLines(tx: EntityManager, dto: OrderInput, previous: OrderItem[] = []) {
    const ids = [...new Set(dto.items.flatMap((i) => (i.menuItemId == null ? [] : [i.menuItemId])))];
    // withDeleted: an item removed from the menu can still appear on an order booked before that.
    const menu = ids.length
      ? await tx.getRepository(MenuItem).find({ where: { id: In(ids) }, withDeleted: true })
      : [];
    const byId = new Map(menu.map((m) => [m.id, m]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length) throw new BadRequestException(`Unknown menu items: ${missing.join(', ')}`);

    const previousPrice = new Map(previous.map((p) => [p.menuItemId, p.menuPricePaise]));
    // Name, unit and menu price for each line, from the menu or from the custom line itself.
    const sources = dto.items.map((i) => {
      if (i.menuItemId == null) {
        return { menuItemId: null, name: i.name!.trim(), unit: i.unit!, menuPricePaise: i.unitPricePaise! };
      }
      const item = byId.get(i.menuItemId)!;
      const menuPricePaise = previousPrice.get(item.id) ?? item.pricePaise;
      return { menuItemId: item.id, name: item.name, unit: item.unit, menuPricePaise };
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

  private orderFields(dto: OrderInput) {
    return {
      customerId: dto.customerId,
      deliveryDate: dto.deliveryDate,
      deliveryTime: dto.deliveryTime ?? null,
      fulfilment: dto.fulfilment,
      address: dto.address ?? null,
      notes: dto.notes ?? null,
    };
  }

  private async assertCustomer(tx: EntityManager, id: number) {
    if (!(await tx.getRepository(Customer).existsBy({ id }))) {
      throw new BadRequestException(`Customer ${id} not found`);
    }
  }

  private insertPayment(tx: EntityManager, orderId: number, dto: PaymentInput) {
    return tx.getRepository(Payment).insert({
      orderId,
      amountPaise: dto.amountPaise,
      mode: dto.mode,
      paidOn: dto.paidOn ?? todayIST(),
      isAdvance: dto.isAdvance ?? false,
      note: dto.note ?? null,
    });
  }
}

function toView(order: Order): OrderView {
  order.items.sort((a, b) => a.sortOrder - b.sortOrder);
  order.payments.sort((a, b) => a.paidOn.localeCompare(b.paidOn) || a.id - b.id);
  const subtotalPaise = order.totalPaise + order.discountPaise;
  const paidPaise = order.payments.reduce((sum, p) => sum + p.amountPaise, 0);
  // Cancelled orders owe nothing, whatever was paid.
  const balancePaise = order.status === 'cancelled' ? 0 : order.totalPaise - paidPaise;
  return Object.assign(order, { subtotalPaise, paidPaise, balancePaise });
}
