import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './menu-item.entity.js';
import type { CreateMenuItemDto, UpdateMenuItemDto } from './menu-item.dto.js';

@Injectable()
export class MenuService {
  // Available items for the public menu page, kept in memory so customers opening the link don't
  // wake the database (DECISIONS.md D17). Cleared by every write below; rebuilt on the next visit.
  private publicCache: MenuItem[] | null = null;

  constructor(@InjectRepository(MenuItem) private readonly items: Repository<MenuItem>) {}

  async publicMenu(): Promise<MenuItem[]> {
    this.publicCache ??= (await this.list()).filter((i) => i.isAvailable);
    return this.publicCache;
  }

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
    const item = await this.items.save(this.items.create({ ...dto, sortOrder }));
    this.publicCache = null;
    return item;
  }

  async update(id: number, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.items.save(this.items.merge(await this.get(id), dto));
    this.publicCache = null;
    return item;
  }

  async remove(id: number): Promise<void> {
    await this.get(id);
    await this.items.softDelete({ id });
    this.publicCache = null;
  }
}
