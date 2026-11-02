import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateMenuItemDto, UpdateMenuItemDto } from './menu-item.dto.js';
import { MenuService } from './menu.service.js';

@Controller('menu-items')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  list() {
    return this.menu.list();
  }

  @Post()
  create(@Body() dto: CreateMenuItemDto) {
    return this.menu.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMenuItemDto) {
    return this.menu.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menu.remove(id);
  }
}
