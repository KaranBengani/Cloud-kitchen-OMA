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
import { CustomerAddress } from '../customers/customer-address.entity.js';
import { Customer } from '../customers/customer.entity.js';
// Order ↔ OrderItem/Payment import each other. With ES modules and decorator metadata that circular
// import crashes at load time, so relation fields use Relation<T> (TypeORM's documented fix).
import { OrderItem } from './order-item.entity.js';
import { Payment } from './payment.entity.js';

// 'requested' and 'declined' are web orders before and after the parents' decision (DECISIONS.md D19).
export const ORDER_STATUSES = ['requested', 'booked', 'ready', 'delivered', 'cancelled', 'declined'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
// Statuses where the customer really owes the order's total.
export const ACTIVE_STATUSES = ['booked', 'ready', 'delivered'] as const;
export const ORDER_SOURCES = ['app', 'web'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];
export const FULFILMENTS = ['pickup', 'parcel'] as const;
export type Fulfilment = (typeof FULFILMENTS)[number];

// Requests and declined orders owe nothing: the customer hasn't been accepted yet.
export const OPEN_BALANCE = `("status" IN ('booked', 'ready', 'delivered') AND "total_paise" > "paid_paise") OR ("status" = 'cancelled' AND "paid_paise" > 0)`;

@Check('CHK_orders_status', `"status" IN ('requested', 'booked', 'ready', 'delivered', 'cancelled', 'declined')`)
@Check('CHK_orders_source', `"source" IN ('app', 'web')`)
@Check('CHK_orders_fulfilment', `"fulfilment" IN ('pickup', 'parcel')`)
@Check('CHK_orders_total', `"total_paise" >= 0`)
@Check('CHK_orders_discount', `"discount_paise" >= 0`)
// Only orders that still owe money, or cancelled orders with a refund due, are in this index, so the
// Dues screen reads a handful of rows however many settled orders pile up over the years.
// The query in OrdersService.dues() must repeat this condition exactly for Postgres to use it.
@Index('IDX_orders_open_balance', ['deliveryDate', 'id'], {
  where: OPEN_BALANCE,
})
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

  // The saved address this order goes to, if any. The text above is still copied onto the order,
  // so editing or deleting a saved address never changes where a past order went.
  @ManyToOne(() => CustomerAddress, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'address_id' })
  savedAddress: Relation<CustomerAddress> | null;

  @Column({ name: 'address_id', type: 'integer', nullable: true })
  addressId: number | null;

  // Order-level special cooking requests ("less oil, no onion").
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 12, default: 'booked' })
  status: OrderStatus;

  // Taken in the app by the parents, or placed by the customer on the menu link (D19).
  @Column({ type: 'varchar', length: 5, default: 'app' })
  source: OrderSource;

  // A web order's typed name when it differs from the name already saved for that phone number.
  // The saved name is never overwritten by what a customer types (D19); parents see both.
  @Column({
    name: 'requested_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  requestedName: string | null;

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
