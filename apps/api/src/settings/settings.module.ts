import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenSettings } from './kitchen-settings.entity.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([KitchenSettings])],
  controllers: [SettingsController],
  providers: [SettingsService],
  // The public menu page and the web order endpoint check the online ordering switch.
  exports: [SettingsService],
})
export class SettingsModule {}
