import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { todayIST } from '../common/today.js';
import type { CreateHolidayDto } from './holiday.dto.js';
import { KitchenHoliday } from './kitchen-holiday.entity.js';

@Injectable()
export class HolidaysService {
  // Upcoming holidays, cached in memory for the public menu and ordering pages, so customers browsing
  // never wake the database (Neon bills compute for the time it's awake). Cleared on every write here,
  // and rebuilt when the date changes because "upcoming" depends on today.
  // One server process, so an in-memory cache can't go stale behind another instance's back.
  private cache: { day: string; holidays: KitchenHoliday[] } | null = null;

  constructor(@InjectRepository(KitchenHoliday) private readonly holidays: Repository<KitchenHoliday>) {}

  // Holidays that haven't ended yet (today in IST onwards), soonest first.
  async upcoming(): Promise<KitchenHoliday[]> {
    const day = todayIST();
    if (this.cache?.day !== day) {
      const holidays = await this.holidays.find({
        where: { endDate: MoreThanOrEqual(day) },
        order: { startDate: 'ASC', id: 'ASC' },
      });
      this.cache = { day, holidays };
    }
    return this.cache.holidays;
  }

  async create(dto: CreateHolidayDto): Promise<KitchenHoliday> {
    if (dto.endDate < dto.startDate) throw new BadRequestException('endDate must be on or after startDate');
    const holiday = await this.holidays.save(
      this.holidays.create({ startDate: dto.startDate, endDate: dto.endDate, note: dto.note?.trim() || null }),
    );
    this.cache = null;
    return holiday;
  }

  async remove(id: number): Promise<void> {
    const result = await this.holidays.delete({ id });
    if (!result.affected) throw new NotFoundException(`Holiday ${id} not found`);
    this.cache = null;
  }
}

// The holiday covering a date, if any. 'YYYY-MM-DD' strings compare correctly as text.
export function holidayOn(holidays: KitchenHoliday[], date: string): KitchenHoliday | undefined {
  return holidays.find((h) => h.startDate <= date && date <= h.endDate);
}
