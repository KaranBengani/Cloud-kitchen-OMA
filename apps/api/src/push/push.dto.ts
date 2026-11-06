import { Matches } from 'class-validator';

export class PushTokenDto {
  @Matches(/^Expo(nent)?PushToken\[[\w-]{1,160}\]$/, { message: 'token must be an Expo push token' })
  token: string;
}
