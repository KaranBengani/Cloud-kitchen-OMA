import { readFileSync } from 'node:fs';
import { Controller, Get, Header, NotFoundException, Param, Req, StreamableFile } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator.js';
import { HolidaysService } from '../holidays/holidays.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { MenuService } from './menu.service.js';
import { renderMenuPage } from './menu-page.js';

// apps/api/assets/menu/, two levels up from both src/menu/ and dist/menu/. Read once at startup.
// Only these files can be fetched: the name in the URL is looked up here, never used as a path.
const ASSETS_DIR = new URL('../../assets/menu/', import.meta.url);
const asset = (file: string, type: string) => ({ body: readFileSync(new URL(file, ASSETS_DIR)), type });
const ASSETS: Record<string, { body: Buffer; type: string }> = {
  'cover.jpg': asset('cover.jpg', 'image/jpeg'),
  'banner.jpg': asset('banner.jpg', 'image/jpeg'),
  'order.js': asset('order.js', 'text/javascript; charset=utf-8'),
};

// The customer-facing menu page (DECISIONS.md D17). Public: anyone with the link can read the menu,
// but only available items and their prices, never orders or customers.
@Public()
@Controller('menu')
export class PublicMenuController {
  constructor(
    private readonly menu: MenuService,
    private readonly holidays: HolidaysService,
    private readonly settings: SettingsService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  // A minute of caching: a price change shows up quickly, and repeat visits skip the database.
  @Header('Cache-Control', 'public, max-age=60')
  async page(@Req() req: Request): Promise<string> {
    // All three come from memory after the first visit: browsing customers don't wake the database.
    const [items, holidays, settings] = await Promise.all([
      this.menu.publicMenu(),
      this.holidays.upcoming(),
      this.settings.get(),
    ]);
    // Render terminates HTTPS in front of the app, so the original scheme is in X-Forwarded-Proto.
    const proto = req.get('x-forwarded-proto')?.split(',')[0] ?? req.protocol;
    return renderMenuPage(items, `${proto}://${req.get('host')}`, holidays, settings.onlineOrdering);
  }

  @Get(':file')
  @Header('Cache-Control', 'public, max-age=86400')
  file(@Param('file') file: string): StreamableFile {
    const found = Object.hasOwn(ASSETS, file) ? ASSETS[file] : undefined;
    if (!found) throw new NotFoundException();
    return new StreamableFile(found.body, { type: found.type });
  }
}
