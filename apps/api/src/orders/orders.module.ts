import { Module } from '@nestjs/common';
import { HolidaysModule } from '../holidays/holidays.module.js';
import { PushModule } from '../push/push.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { WebOrdersController } from './web-orders.controller.js';

// Entities are reached through the DataSource inside transactions, so no forFeature() repositories here.
@Module({
  // Web orders can't be placed on a kitchen holiday, or while online ordering is switched off,
  // and each one sends a push notification to the family's phones.
  imports: [HolidaysModule, SettingsModule, PushModule],
  controllers: [OrdersController, WebOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
