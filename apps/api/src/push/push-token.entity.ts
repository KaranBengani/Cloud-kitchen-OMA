import { CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// One row per family phone that should hear about new web orders (DECISIONS.md D20). The app registers its
// Expo push token after login; Expo forwards notifications to Firebase, which wakes the phone.
@Entity({ name: 'push_tokens' })
export class PushToken {
  // Looks like "ExponentPushToken[xxxxxxxx]". The token itself is the key: registering twice is one row.
  @PrimaryColumn({ type: 'varchar', length: 200 })
  token: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Moves on every registration (each app start), so stale phones can be spotted.
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
