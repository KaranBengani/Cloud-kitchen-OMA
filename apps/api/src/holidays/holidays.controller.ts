import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateHolidayDto } from './holiday.dto.js';
import { HolidaysService } from './holidays.service.js';

// For the app (PIN-protected). Customers see holidays on the public menu page instead.
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  upcoming() {
    return this.holidays.upcoming();
  }

  @Post()
  create(@Body() dto: CreateHolidayDto) {
    return this.holidays.create(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.holidays.remove(id);
  }
}
