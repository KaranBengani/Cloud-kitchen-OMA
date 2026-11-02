import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

// Accepts what people actually type ("98304 60199", "+91-98304-60199", "09830460199") and stores
// one canonical form with country code, so the same person can't end up as two customers.
export function normalizePhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/\D/g, '').replace(/^0+/, '');
  if (digits === '') return null;
  return digits.length === 10 ? `91${digits}` : digits;
}

export class CreateCustomerDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsOptional()
  @Transform(({ value }) => normalizePhone(value))
  @Matches(/^91[6-9]\d{9}$/, { message: 'phone must be a 10-digit Indian mobile number' })
  phone?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
