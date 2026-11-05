import { IsOptional, IsString, Length, Matches } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateHolidayDto {
  @Matches(DATE, { message: 'startDate must be YYYY-MM-DD' })
  startDate: string;

  // Same as startDate for a single day.
  @Matches(DATE, { message: 'endDate must be YYYY-MM-DD' })
  endDate: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  note?: string | null;
}
