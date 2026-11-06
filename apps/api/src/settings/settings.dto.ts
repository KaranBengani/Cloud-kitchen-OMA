import { IsBoolean } from 'class-validator';

export class UpdateSettingsDto {
  @IsBoolean()
  onlineOrdering: boolean;
}
