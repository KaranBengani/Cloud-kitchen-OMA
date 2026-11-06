import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KitchenSettings } from './kitchen-settings.entity.js';

export interface SettingsView {
  onlineOrdering: boolean;
}

@Injectable()
export class SettingsService {
  // Read by every public menu visit, so cached in memory like the menu and holidays: customers browsing
  // never wake the database. Writes go through set(), which refreshes it (one server process).
  private cache: SettingsView | null = null;

  constructor(@InjectRepository(KitchenSettings) private readonly settings: Repository<KitchenSettings>) {}

  async get(): Promise<SettingsView> {
    if (!this.cache) {
      const row = await this.settings.findOneByOrFail({ id: 1 });
      this.cache = { onlineOrdering: row.onlineOrdering };
    }
    return this.cache;
  }

  async set(changes: SettingsView): Promise<SettingsView> {
    await this.settings.update({ id: 1 }, { onlineOrdering: changes.onlineOrdering });
    this.cache = null;
    return this.get();
  }
}
