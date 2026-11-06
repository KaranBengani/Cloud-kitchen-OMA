import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdateSettingsDto } from './settings.dto.js';
import { SettingsService } from './settings.service.js';

// For the app (PIN-protected): Settings → Online orders.
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.set(dto);
  }
}
