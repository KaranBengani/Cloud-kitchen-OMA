import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
// Customer ↔ CustomerAddress import each other: Relation<T> avoids the ES-module load-order crash.
import { CustomerAddress } from './customer-address.entity.js';

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  // Digits only with country code, e.g. "919830460199", so it can go straight into a wa.me link.
  // Unique when present: one person, one customer record. Nullable for the rare walk-in with no number.
  @Index('UQ_customers_phone', { unique: true, where: '"phone" IS NOT NULL' })
  @Column({ type: 'varchar', length: 15, nullable: true })
  phone: string | null;

  // Addresses moved to their own table (DECISIONS.md D19): one customer can send food to several places.
  @OneToMany(() => CustomerAddress, (address) => address.customer)
  addresses: Relation<CustomerAddress[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
