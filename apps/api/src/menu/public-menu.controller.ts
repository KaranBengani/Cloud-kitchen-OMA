import { readFileSync } from 'node:fs';
import { Controller, Get, Header, NotFoundException, Param, Req, StreamableFile } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator.js';
import { HolidaysService } from '../holidays/holidays.service.js';
import { MenuService } from './menu.service.js';
import { renderMenuPage } from './menu-page.js';

// apps/api/assets/menu/, two levels up from both src/menu/ and dist/menu/. Read once at startup.
const ASSETS = new URL('../../assets/menu/', import.meta.url);
const IMAGES: Record<string, Buffer> = {
  'cover.jpg': readFileSync(new URL('cover.jpg', ASSETS)),
  'banner.jpg': readFileSync(new URL('banner.jpg', ASSETS)),
};

// The customer-facing menu page (DECISIONS.md D17). Public: anyone with the link can read the menu,
// but only available items and their prices, never orders or customers.
@Public()
@Controller('menu')
export class PublicMenuController {
  constructor(
    private readonly menu: MenuService,
    private readonly holidays: HolidaysService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  // A minute of caching: a price change shows up quickly, and repeat visits skip the database.
  @Header('Cache-Control', 'public, max-age=60')
  async page(@Req() req: Request): Promise<string> {
    // Both come from memory after the first visit: browsing customers don't wake the database.
    const [items, holidays] = await Promise.all([this.menu.publicMenu(), this.holidays.upcoming()]);
    // Render terminates HTTPS in front of the app, so the original scheme is in X-Forwarded-Proto.
    const proto = req.get('x-forwarded-proto')?.split(',')[0] ?? req.protocol;
    return renderMenuPage(items, `${proto}://${req.get('host')}`, holidays);
  }

  @Get(':file')
  @Header('Cache-Control', 'public, max-age=86400')
  image(@Param('file') file: string): StreamableFile {
    const image = Object.hasOwn(IMAGES, file) ? IMAGES[file] : undefined;
    if (!image) throw new NotFoundException();
    return new StreamableFile(image, { type: 'image/jpeg' });
  }
}
