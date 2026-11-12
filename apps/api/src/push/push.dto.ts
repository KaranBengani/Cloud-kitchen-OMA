import { IsIn, IsOptional, Matches } from 'class-validator';
import { PUSH_CHANNELS, type PushChannel } from './push-token.entity.js';

export class PushTokenDto {
  @Matches(/^Expo(nent)?PushToken\[[\w-]{1,160}\]$/, { message: 'token must be an Expo push token' })
  token: string;
}

export class RegisterPushTokenDto extends PushTokenDto {
  @IsOptional()
  @IsIn(PUSH_CHANNELS)
  channelId?: PushChannel;
}
