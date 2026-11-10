import { Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { PushTokenDto } from './push.dto.js';
import { PushService } from './push.service.js';

// For the app (PIN-protected): a logged-in phone registers to hear about new web orders.
@Controller('push-tokens')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post()
  @HttpCode(204)
  register(@Body() dto: PushTokenDto) {
    return this.push.register(dto.token);
  }

  // On logout, so a phone that's no longer logged in stops getting order alerts.
  @Delete()
  @HttpCode(204)
  unregister(@Body() dto: PushTokenDto) {
    return this.push.unregister(dto.token);
  }
}
