import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Customer } from './customer.entity.js';
import type { CreateCustomerDto, UpdateCustomerDto } from './customer.dto.js';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private readonly customers: Repository<Customer>) {}

  // Search by name fragment or phone digits; most recently updated first, so regulars surface.
  // ILIKE without an index is fine at this size (hundreds of rows); a trigram index is the upgrade path.
  search(q?: string): Promise<Customer[]> {
    const qb = this.customers.createQueryBuilder('c').orderBy('c.updatedAt', 'DESC').limit(30);
    const term = q?.trim();
    if (term) {
      const digits = term.replace(/\D/g, '');
      qb.where('c.name ILIKE :name', { name: `%${term}%` });
      if (digits.length >= 3) qb.orWhere('c.phone LIKE :phone', { phone: `%${digits}%` });
    }
    return qb.getMany();
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
