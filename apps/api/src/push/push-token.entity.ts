import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Android notification channels the app may create. A channel's sound is fixed once created, so the custom order
// sound (app 1.2.0) needed a new one; app 1.1.0 phones only have 'orders' and keep getting alerts there.
export const PUSH_CHANNELS = ['orders', 'new-orders'] as const;
export type PushChannel = (typeof PUSH_CHANNELS)[number];

// One row per family phone that should hear about new web orders (DECISIONS.md D20). The app registers its
// Expo push token after login; Expo forwards notifications to Firebase, which wakes the phone.
@Entity({ name: 'push_tokens' })
export class PushToken {
  // Looks like "ExponentPushToken[xxxxxxxx]". The token itself is the key: registering twice is one row.
  @PrimaryColumn({ type: 'varchar', length: 200 })
  token: string;

  // The channel this phone created, sent when it registers; 1.1.0 phones don't send one.
  @Column({ name: 'channel_id', type: 'varchar', length: 40, default: 'orders' })
  channelId: PushChannel;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Moves on every registration (each app start), so stale phones can be spotted.
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
