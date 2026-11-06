import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushController } from './push.controller.js';
import { PushToken } from './push-token.entity.js';
import { PushService } from './push.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken])],
  controllers: [PushController],
  providers: [PushService],
  // OrdersService notifies the family when a web order arrives.
  exports: [PushService],
})
export class PushModule {}
