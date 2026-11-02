import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

// Entities are reached through the DataSource inside transactions, so no forFeature() repositories here.
@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
