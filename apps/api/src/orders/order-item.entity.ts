import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer.js';
import { MenuItem } from '../menu/menu-item.entity.js';
import { Order } from './order.entity.js';

// A snapshot of the menu line at order time (DECISIONS.md D7): changing the menu later
// never rewrites what an old order cost.
@Check('CHK_order_items_qty', `"qty" > 0`)
@Check('CHK_order_items_prices', `"menu_price_paise" >= 0 AND "unit_price_paise" >= 0 AND "line_total_paise" >= 0`)
@Entity({ name: 'order_items' })
export class OrderItem {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Relation<Order>;

  // Postgres doesn't index foreign keys automatically; every order load joins on this.
  @Index('IDX_order_items_order_id')
  @Column({ name: 'order_id', type: 'integer' })
  orderId: number;

  // Kept for reporting ("how many Khandvi did we sell?"); null if the menu item is ever hard-deleted.
  @ManyToOne(() => MenuItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem | null;

  @Column({ name: 'menu_item_id', type: 'integer', nullable: true })
  menuItemId: number | null;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 10 })
  unit: string;

  @Column({ type: 'numeric', precision: 10, scale: 3, transformer: numericTransformer })
  qty: number;

  // Menu price at order time, kept so the bill can show "₹440 → ₹400" for an override.
  @Column({ name: 'menu_price_paise', type: 'integer' })
  menuPricePaise: number;

  // Price actually charged per unit: equals menuPricePaise unless overridden for this customer.
  @Column({ name: 'unit_price_paise', type: 'integer' })
  unitPricePaise: number;

  @Column({ name: 'line_total_paise', type: 'integer' })
  lineTotalPaise: number;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;
}
