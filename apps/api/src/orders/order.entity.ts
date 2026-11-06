import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../customers/customer.entity.js';
// Order ↔ OrderItem/Payment import each other. With ES modules and decorator metadata that circular
// import crashes at load time, so relation fields use Relation<T> (TypeORM's documented fix).
import { OrderItem } from './order-item.entity.js';
import { Payment } from './payment.entity.js';

export const ORDER_STATUSES = ['booked', 'ready', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const FULFILMENTS = ['pickup', 'parcel'] as const;
export type Fulfilment = (typeof FULFILMENTS)[number];

export const OPEN_BALANCE = `("status" <> 'cancelled' AND "total_paise" > "paid_paise") OR ("status" = 'cancelled' AND "paid_paise" > 0)`;

@Check('CHK_orders_status', `"status" IN ('booked', 'ready', 'delivered', 'cancelled')`)
@Check('CHK_orders_fulfilment', `"fulfilment" IN ('pickup', 'parcel')`)
@Check('CHK_orders_total', `"total_paise" >= 0`)
@Check('CHK_orders_discount', `"discount_paise" >= 0`)
// Only orders that still owe money, or cancelled orders with a refund due, are in this index, so the
// Dues screen reads a handful of rows however many settled orders pile up over the years.
// The query in OrdersService.dues() must repeat this condition exactly for Postgres to use it.
@Index('IDX_orders_open_balance', ['deliveryDate', 'id'], { where: OPEN_BALANCE })
@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Index('IDX_orders_customer_id')
  @Column({ name: 'customer_id', type: 'integer' })
  customerId: number;

  // The kitchen's day, not an instant: "deliver on 14 Nov". A DATE avoids timezone shifts
  // that a timestamp would cause (midnight IST is the previous day in UTC).
  // Indexed because the main screen is "orders from today onwards".
  @Index('IDX_orders_delivery_date')
  @Column({ name: 'delivery_date', type: 'date' })
  deliveryDate: string;

  // "HH:MM", optional: many orders are just "Saturday lunch".
  @Column({ name: 'delivery_time', type: 'time', nullable: true })
  deliveryTime: string | null;

  @Column({ type: 'varchar', length: 10, default: 'pickup' })
  fulfilment: Fulfilment;

  // Copied from the customer when the order is taken, then editable: one-off addresses are common.
  @Column({ type: 'text', nullable: true })
  address: string | null;

  // Order-level special cooking requests ("less oil, no onion").
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 12, default: 'booked' })
  status: OrderStatus;

  // One optional discount on the whole order (DECISIONS.md D13), on top of any per-line price overrides.
  @Column({ name: 'discount_paise', type: 'integer', default: 0 })
  discountPaise: number;

  // What the customer owes: sum of line totals − discount, recomputed by the server on every save
  // inside the same transaction. Stored (not computed per read) because the order list and dues
  // screen need it constantly.
  @Column({ name: 'total_paise', type: 'integer' })
  totalPaise: number;

  // Sum of this order's payments (refunds are negative). Kept in step by OrdersService in the same
  // transaction as every payment insert or delete (DECISIONS.md D9, revised 6 Nov), so Dues and
  // customer search never have to add up the payments table.
  @Column({ name: 'paid_paise', type: 'integer', default: 0 })
  paidPaise: number;

  // Optimistic locking (DECISIONS.md D6). Bumped by OrdersService on every write;
  // a write carrying an old version is rejected with 409.
  @Column({ type: 'integer', default: 1 })
  version: number;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: Relation<OrderItem[]>;

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Relation<Payment[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
