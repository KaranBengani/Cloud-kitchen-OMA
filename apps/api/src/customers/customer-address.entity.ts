import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity.js';

export const ADDRESS_LABELS = ['home', 'office', 'family', 'other'] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

// A customer's saved delivery addresses (DECISIONS.md D19): their own, or a friend's they send food to.
// Shared by the app and the web order form, so one customer has one address book.
@Check('CHK_customer_addresses_label', `"label" IN ('home', 'office', 'family', 'other')`)
// The same address typed twice (different spacing, case or commas) reuses one row; see addressKey().
@Index('UQ_customer_addresses_key', ['customerId', 'addressKey'], {
  unique: true,
})
@Entity({ name: 'customer_addresses' })
export class CustomerAddress {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => Customer, (customer) => customer.addresses, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Relation<Customer>;

  // No separate index: UQ_customer_addresses_key starts with customer_id, so it serves lookups by customer.
  @Column({ name: 'customer_id', type: 'integer' })
  customerId: number;

  @Column({ type: 'varchar', length: 10, default: 'home' })
  label: AddressLabel;

  // Who receives it, when the order is for someone else. Optional.
  @Column({
    name: 'recipient_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  recipientName: string | null;

  @Column({
    name: 'recipient_phone',
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  recipientPhone: string | null;

  @Column({ type: 'text' })
  address: string;

  // Lower-case letters and digits only; never sent to the app.
  @Column({ name: 'address_key', type: 'text', select: false })
  addressKey: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Bumped whenever the address is used again, so the most recent one is offered first.
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// "Flat 4B, Park St." and "flat 4b park st" are the same address. Must match the SQL used to
// backfill existing addresses in migration WebOrdering: lower(), non-letters/digits → one space, trim.
export function addressKey(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
