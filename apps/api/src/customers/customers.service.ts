import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { saveAddress } from './address-book.js';
import { CustomerAddress } from './customer-address.entity.js';
import { Customer } from './customer.entity.js';
import type { CreateCustomerDto, UpdateCustomerDto } from './customer.dto.js';

const UNIQUE_VIOLATION = '23505';

export type AddressView = Pick<CustomerAddress, 'id' | 'label' | 'recipientName' | 'recipientPhone' | 'address'>;

// What the app receives for a customer: their saved addresses, most recently used first.
// `address` repeats the first one's text so app builds from before the address book still work.
export type CustomerView = Pick<Customer, 'id' | 'name' | 'phone'> & {
  address: string | null;
  addresses: AddressView[];
};

// Search results also carry how much they owe, shown next to each name on the New order screen.
export type CustomerSummary = CustomerView & { duePaise: number };

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(CustomerAddress)
    private readonly addresses: Repository<CustomerAddress>,
    private readonly db: DataSource,
  ) {}

  // Search by name fragment or phone digits. Customers who ordered most recently come first, so
  // regulars surface without typing. Each row includes the customer's unpaid balance across
  // non-cancelled orders, so a new order can be taken knowing they already owe money.
  // LATERAL runs the per-customer summary through IDX_orders_customer_id for each matching customer,
  // instead of adding up every order in the database on every keystroke. Balances come from the
  // stored orders.paid_paise, so the payments table isn't read at all.
  // ILIKE without an index is fine at this size (hundreds of rows); a trigram index is the upgrade path.
  async search(q?: string): Promise<CustomerSummary[]> {
    const term = q?.trim() ?? '';
    const digits = term.replace(/\D/g, '');
    const rows: Record<string, unknown>[] = await this.db.query(
      `
      SELECT c.id, c.name, c.phone, s.due_paise
      FROM customers c
      CROSS JOIN LATERAL (
        SELECT MAX(o.created_at) AS last_order_at,
               -- GREATEST: an overpaid order is not a credit against another order's debt.
               COALESCE(SUM(GREATEST(o.total_paise - o.paid_paise, 0))
                        FILTER (WHERE o.status IN ('booked', 'ready', 'delivered')), 0)::int AS due_paise
        FROM orders o
        WHERE o.customer_id = c.id
      ) s
      WHERE $1 = '' OR c.name ILIKE '%' || $1 || '%' OR (length($2) >= 3 AND c.phone LIKE '%' || $2 || '%')
      ORDER BY s.last_order_at DESC NULLS LAST, c.updated_at DESC
      LIMIT 30
      `,
      [term, digits],
    );
    const books = await this.addressBooks(rows.map((r) => r.id as number));
    return rows.map((r) => ({
      ...withAddresses(
        {
          id: r.id as number,
          name: r.name as string,
          phone: r.phone as string | null,
        },
        books,
      ),
      duePaise: r.due_paise as number,
    }));
  }

  async get(id: number): Promise<CustomerView> {
    const customer = await this.customers.findOneBy({ id });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return withAddresses(customer, await this.addressBooks([id]));
  }

  // An address typed in the customer form goes into the address book (as Home for a new customer).
  create(dto: CreateCustomerDto): Promise<CustomerView> {
    return this.db.transaction(async (tx) => {
      const customer = await this.saveUnique(
        tx,
        tx.getRepository(Customer).create({ name: dto.name, phone: dto.phone }),
      );
      if (dto.address?.trim()) await saveAddress(tx, customer.id, { address: dto.address });
      return withAddresses(customer, await this.addressBooks([customer.id], tx));
    });
  }

  update(id: number, dto: UpdateCustomerDto): Promise<CustomerView> {
    return this.db.transaction(async (tx) => {
      const existing = await tx.getRepository(Customer).findOneBy({ id });
      if (!existing) throw new NotFoundException(`Customer ${id} not found`);
      const { address, ...fields } = dto;
      const customer = await this.saveUnique(tx, tx.getRepository(Customer).merge(existing, fields));
      if (address?.trim()) await saveAddress(tx, id, { address });
      return withAddresses(customer, await this.addressBooks([id], tx));
    });
  }

  // One query for all the customers' addresses (not one per customer), grouped in memory.
  private async addressBooks(ids: number[], tx: EntityManager = this.db.manager) {
    const books = new Map<number, AddressView[]>();
    if (!ids.length) return books;
    const rows = await tx.getRepository(CustomerAddress).find({
      where: { customerId: In(ids) },
      order: { updatedAt: 'DESC', id: 'DESC' },
    });
    for (const { customerId, id, label, recipientName, recipientPhone, address } of rows) {
      books.set(customerId, [...(books.get(customerId) ?? []), { id, label, recipientName, recipientPhone, address }]);
    }
    return books;
  }

  // The unique index is the real guard against duplicate phones (two phones could create the
  // same customer at the same moment); this turns its error into a readable 409.
  private async saveUnique(tx: EntityManager, customer: Customer): Promise<Customer> {
    try {
      return await tx.getRepository(Customer).save(customer);
    } catch (e) {
      if (e instanceof QueryFailedError && (e.driverError as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException('A customer with this phone number already exists');
      }
      throw e;
    }
  }
}

function withAddresses(
  customer: Pick<Customer, 'id' | 'name' | 'phone'>,
  books: Map<number, AddressView[]>,
): CustomerView {
  const addresses = books.get(customer.id) ?? [];
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    address: addresses[0]?.address ?? null,
    addresses,
  };
}
