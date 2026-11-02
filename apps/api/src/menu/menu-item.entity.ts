import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer.js';

export const MENU_UNITS = ['kg', 'pc', 'plate', 'bowl', 'roll', 'pizza'] as const;
export type MenuUnit = (typeof MENU_UNITS)[number];

// Model from the Canva menu (DECISIONS.md D8). Variants like "Veg/Paneer momo" are separate rows.
// Checks live in the database too, so bad data can't get in even through a bug in the API.
@Check('CHK_menu_items_price', `"price_paise" >= 0`)
@Check('CHK_menu_items_unit', `"unit" IN ('kg', 'pc', 'plate', 'bowl', 'roll', 'pizza')`)
@Check('CHK_menu_items_min_qty', `"min_qty" IS NULL OR "min_qty" > 0`)
@Entity({ name: 'menu_items' })
export class MenuItem {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  // Free text, not a table: there are 4 categories and parents may add one rarely.
  @Column({ type: 'varchar', length: 60 })
  category: string;

  @Column({ type: 'varchar', length: 10 })
  unit: MenuUnit;

  // Price for ONE unit (one kg, one plate, ...) in paise: ₹400 is 40000.
  @Column({ name: 'price_paise', type: 'integer' })
  pricePaise: number;

  // A warning in the app, not a hard rule. Null means no minimum.
  @Column({ name: 'min_qty', type: 'numeric', precision: 10, scale: 3, nullable: true, transformer: numericTransformer })
  minQty: number | null;

  // Extra detail printed under the name, e.g. "6 pcs/plate".
  @Column({ type: 'varchar', length: 120, nullable: true })
  description: string | null;

  // Off for seasonal items (Gajar Halwa outside winter) without losing them.
  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean;

  // Order on the menu screen and in the shared menu text.
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Soft delete: old orders keep their own copy of name and price anyway,
  // but keeping the row avoids breaking any reference to it.
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
