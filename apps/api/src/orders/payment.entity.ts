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
} from 'typeorm';
import { Order } from './order.entity.js';

export const PAYMENT_MODES = ['cash', 'upi_papa', 'upi_mummy'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

// One row per money movement (DECISIONS.md D9). Balance due is always total − sum(payments),
// computed on read, so it can never drift out of sync. A refund is a negative amount (D12).
@Check('CHK_payments_mode', `"mode" IN ('cash', 'upi_papa', 'upi_mummy')`)
@Check('CHK_payments_amount', `"amount_paise" <> 0`)
@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => Order, (order) => order.payments, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Relation<Order>;

  @Index('IDX_payments_order_id')
  @Column({ name: 'order_id', type: 'integer' })
  orderId: number;

  @Column({ name: 'amount_paise', type: 'integer' })
  amountPaise: number;

  @Column({ type: 'varchar', length: 12 })
  mode: PaymentMode;

  @Column({ name: 'paid_on', type: 'date' })
  paidOn: string;

  @Column({ name: 'is_advance', type: 'boolean', default: false })
  isAdvance: boolean;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
