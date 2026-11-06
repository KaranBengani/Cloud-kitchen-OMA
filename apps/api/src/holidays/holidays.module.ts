import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolidaysController } from './holidays.controller.js';
import { HolidaysService } from './holidays.service.js';
import { KitchenHoliday } from './kitchen-holiday.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([KitchenHoliday])],
  controllers: [HolidaysController],
  providers: [HolidaysService],
  // The public menu page shows upcoming holidays.
  exports: [HolidaysService],
})
export class HolidaysModule {}
