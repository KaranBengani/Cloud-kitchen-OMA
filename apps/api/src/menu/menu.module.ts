import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolidaysModule } from '../holidays/holidays.module.js';
import { MenuItem } from './menu-item.entity.js';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
import { PublicMenuController } from './public-menu.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem]), HolidaysModule],
  controllers: [MenuController, PublicMenuController],
  providers: [MenuService],
})
export class MenuModule {}
