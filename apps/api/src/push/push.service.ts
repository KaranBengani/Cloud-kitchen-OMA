import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { dayLabel, menuPrice } from '../menu/menu-page.js';
import { type PushChannel, PushToken } from './push-token.entity.js';

// Expo's push service: free, no key needed for a project without "enhanced security". It hands each
// message to Firebase Cloud Messaging for Android. https://docs.expo.dev/push-notifications/sending-notifications/
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface NewWebOrder {
  orderId: number;
  name: string;
  deliveryDate: string;
  itemCount: number;
  totalPaise: number;
}

interface PushTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(@InjectRepository(PushToken) private readonly tokens: Repository<PushToken>) {}

  // Upsert, so the app can register on every start without creating duplicates.
  async register(token: string, channelId: PushChannel): Promise<void> {
    await this.tokens.upsert({ token, channelId }, ['token']);
  }

  async unregister(token: string): Promise<void> {
    await this.tokens.delete({ token });
  }

  // "New order request #12" on every family phone; tapping it opens the request (data.orderId).
  // Never throws: a failed notification must not fail the customer's order, which is already saved.
  async newWebOrder(order: NewWebOrder): Promise<void> {
    try {
      const rows = await this.tokens.find({ select: { token: true, channelId: true } });
      if (!rows.length) return;
      const items = `${order.itemCount} ${order.itemCount === 1 ? 'item' : 'items'}`;
      const messages = rows.map(({ token, channelId }) => ({
        to: token,
        title: `New order request #${order.orderId}`,
        body: `${order.name} · ${dayLabel(order.deliveryDate)} · ${items} · ₹${menuPrice(order.totalPaise)}`,
        data: { orderId: order.orderId },
        // The Android channel that phone created (its sound lives there); "high" wakes a phone in battery saver.
        channelId,
        priority: 'high',
        sound: 'default',
      }));
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        this.logger.warn(`Expo push failed with HTTP ${response.status}`);
        return;
      }
      // Tickets come back in the same order as the messages. A phone that uninstalled the app answers
      // DeviceNotRegistered: forget its token so it isn't sent to again.
      const { data: tickets } = (await response.json()) as { data: PushTicket[] };
      const gone = rows.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered').map((row) => row.token);
      if (gone.length) await this.tokens.delete({ token: In(gone) });
      const failed = tickets.filter((t) => t.status === 'error').length;
      // Counts only: tokens identify a family member's phone and stay out of the logs.
      if (failed) this.logger.warn(`${failed} of ${tickets.length} push notifications failed`);
    } catch (error) {
      this.logger.warn(`Expo push failed: ${(error as Error).message}`);
    }
  }
}
