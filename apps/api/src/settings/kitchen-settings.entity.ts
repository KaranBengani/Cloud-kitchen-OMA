import { Check, Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Kitchen-wide switches set from the app's Settings screen (DECISIONS.md D20). Exactly one row (id 1),
// created by the migration, so reads never have to handle "no settings yet".
@Check('CHK_kitchen_settings_single_row', `"id" = 1`)
@Entity({ name: 'kitchen_settings' })
export class KitchenSettings {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id: number;

  // Whether customers can place orders from the menu link. Off: the page is a plain menu with the
  // WhatsApp button, as before online ordering.
  @Column({ name: 'online_ordering', type: 'boolean', default: false })
  onlineOrdering: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
