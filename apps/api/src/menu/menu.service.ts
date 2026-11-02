import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './menu-item.entity.js';
import type { CreateMenuItemDto, UpdateMenuItemDto } from './menu-item.dto.js';

@Injectable()
export class MenuService {
  constructor(@InjectRepository(MenuItem) private readonly items: Repository<MenuItem>) {}

  // Soft-deleted rows are excluded automatically because of @DeleteDateColumn.
  list(): Promise<MenuItem[]> {
    return this.items.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async get(id: number): Promise<MenuItem> {
    const item = await this.items.findOneBy({ id });
    if (!item) throw new NotFoundException(`Menu item ${id} not found`);
    return item;
  }

  async create(dto: CreateMenuItemDto): Promise<MenuItem> {
    // New items go to the end of the menu unless a position is given.
    const sortOrder = dto.sortOrder ?? ((await this.items.maximum('sortOrder')) ?? 0) + 10;
    return this.items.save(this.items.create({ ...dto, sortOrder }));
  }

  async update(id: number, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.get(id);
    return this.items.save(this.items.merge(item, dto));
  }

  async remove(id: number): Promise<void> {
    await this.get(id);
    await this.items.softDelete({ id });
  }
}
