import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Days the kitchen takes no orders (DECISIONS.md D18). A range, so "Diwali, 10–12 Nov" is one row.
// Dates are kitchen days ('YYYY-MM-DD'), like orders.delivery_date.
@Check('CHK_kitchen_holidays_range', `"end_date" >= "start_date"`)
@Entity({ name: 'kitchen_holidays' })
export class KitchenHoliday {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  // Indexed: every read is "holidays that haven't ended yet".
  @Index('IDX_kitchen_holidays_end_date')
  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  // Shown to customers on the menu page, e.g. "Diwali".
  @Column({ type: 'varchar', length: 80, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
