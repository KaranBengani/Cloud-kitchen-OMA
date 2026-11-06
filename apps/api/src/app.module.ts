import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { ClientIpThrottlerGuard } from './common/client-ip-throttler.guard.js';
import { CustomersModule } from './customers/customers.module.js';
import { type Env, validateEnv } from './config/env.js';
import { typeormOptions } from './database/typeorm.options.js';
import { HealthController } from './health/health.controller.js';
import { HolidaysModule } from './holidays/holidays.module.js';
import { MenuModule } from './menu/menu.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { SettingsModule } from './settings/settings.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => typeormOptions(config.get('DATABASE_URL', { infer: true })),
    }),
    // Default rate limit for every route; the login route sets a stricter one.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    MenuModule,
    CustomersModule,
    OrdersModule,
    HolidaysModule,
    SettingsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ClientIpThrottlerGuard }],
})
export class AppModule {}
