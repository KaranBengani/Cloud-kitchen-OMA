import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Customer } from './customer.entity.js';
import type { CreateCustomerDto, UpdateCustomerDto } from './customer.dto.js';

const UNIQUE_VIOLATION = '23505';

// Search results carry what the New order screen shows next to each name: how much they owe.
export type CustomerSummary = Pick<Customer, 'id' | 'name' | 'phone' | 'address'> & { duePaise: number };

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
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
      SELECT c.id, c.name, c.phone, c.address, s.due_paise
      FROM customers c
      CROSS JOIN LATERAL (
        SELECT MAX(o.created_at) AS last_order_at,
               -- GREATEST: an overpaid order is not a credit against another order's debt.
               COALESCE(SUM(GREATEST(o.total_paise - o.paid_paise, 0))
                        FILTER (WHERE o.status <> 'cancelled'), 0)::int AS due_paise
        FROM orders o
        WHERE o.customer_id = c.id
      ) s
      WHERE $1 = '' OR c.name ILIKE '%' || $1 || '%' OR (length($2) >= 3 AND c.phone LIKE '%' || $2 || '%')
      ORDER BY s.last_order_at DESC NULLS LAST, c.updated_at DESC
      LIMIT 30
      `,
      [term, digits],
    );
    return rows.map((r) => ({
      id: r.id as number,
      name: r.name as string,
      phone: r.phone as string | null,
      address: r.address as string | null,
      duePaise: r.due_paise as number,
    }));
  }

  async get(id: number): Promise<Customer> {
    const customer = await this.customers.findOneBy({ id });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    return this.saveUnique(this.customers.create(dto));
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    return this.saveUnique(this.customers.merge(await this.get(id), dto));
  }

  // The unique index is the real guard against duplicate phones (two phones could create the
  // same customer at the same moment); this turns its error into a readable 409.
  private async saveUnique(customer: Customer): Promise<Customer> {
    try {
      return await this.customers.save(customer);
    } catch (e) {
      if (e instanceof QueryFailedError && (e.driverError as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException('A customer with this phone number already exists');
      }
      throw e;
    }
  }
}
