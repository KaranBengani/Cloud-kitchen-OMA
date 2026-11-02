import { Matches } from 'class-validator';

export class LoginDto {
  @Matches(/^\d{6}$/, { message: 'PIN must be 6 digits' })
  pin: string;
}
