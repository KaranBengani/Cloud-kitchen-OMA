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
  // ILIKE without an index is fine at this size (hundreds of rows); a trigram index is the upgrade path.
  async search(q?: string): Promise<CustomerSummary[]> {
    const term = q?.trim() ?? '';
    const digits = term.replace(/\D/g, '');
    const rows: Record<string, unknown>[] = await this.db.query(
      `
      SELECT c.id, c.name, c.phone, c.address, COALESCE(s.due_paise, 0)::int AS due_paise
      FROM customers c
      LEFT JOIN (
        SELECT o.customer_id,
               MAX(o.created_at) AS last_order_at,
               -- GREATEST: an overpaid order is not a credit against another order's debt.
               SUM(CASE WHEN o.status <> 'cancelled'
                        THEN GREATEST(o.total_paise - COALESCE(p.paid, 0), 0) ELSE 0 END) AS due_paise
        FROM orders o
        LEFT JOIN (SELECT order_id, SUM(amount_paise) AS paid FROM payments GROUP BY order_id) p
               ON p.order_id = o.id
        GROUP BY o.customer_id
      ) s ON s.customer_id = c.id
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
