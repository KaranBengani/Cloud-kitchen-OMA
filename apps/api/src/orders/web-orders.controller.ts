import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator.js';
import { SettingsService } from '../settings/settings.service.js';
import { WebOrderDto } from './order.dto.js';
import { OrdersService, type WebOrderReceipt } from './orders.service.js';

// The order form on the public menu page posts here (DECISIONS.md D19). No login, so it's limited
// hard: 10 tries an hour from one network (typos and rejected dates count too), plus an overall cap inside OrdersService.
@Public()
@Controller('order')
export class WebOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly settings: SettingsService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post()
  async place(@Body() dto: WebOrderDto): Promise<WebOrderReceipt> {
    // The page hides the form when ordering is off, but a page opened before the switch was flipped
    // can still post. The message is shown to the customer as is.
    if (!(await this.settings.get()).onlineOrdering) {
      throw new ForbiddenException('Online ordering is paused right now. Please order on WhatsApp or call us.');
    }
    // A filled honeypot means a bot: answer like a success so it learns nothing, and save nothing.
    if (dto.website) return { orderId: 0, totalPaise: 0 };
    return this.orders.createWebOrder(dto);
  }
}
