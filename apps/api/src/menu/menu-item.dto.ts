import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsInt, IsOptional, IsPositive, IsString, Length, Max, Min } from 'class-validator';
import { MENU_UNITS, type MenuUnit } from './menu-item.entity.js';

// Validation mirrors the DB constraints so bad input gets a readable 400 instead of a 500 from Postgres.
export class CreateMenuItemDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  nameHi?: string | null;

  @IsString()
  @Length(1, 60)
  category: string;

  @IsIn(MENU_UNITS)
  unit: MenuUnit;

  @IsInt()
  @Min(0)
  @Max(10_000_000) // ₹1,00,000 per unit is already absurd for this kitchen
  pricePaise: number;

  @IsOptional()
  @IsPositive()
  minQty?: number | null;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

// Every field optional, same rules. JPA/Spring equivalent: a separate PATCH request DTO.
export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}
