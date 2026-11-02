import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator.js';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  // Full check, for a human after a deploy. Touches the DB so a broken database connection
  // shows up as unhealthy, not as a healthy server that fails every request.
  @Public()
  @Get()
  async check() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok' };
  }

  // For Render's health check and the keep-alive ping. Deliberately doesn't touch the DB:
  // pinging Postgres every few minutes would keep Neon's free compute awake around the clock
  // and use up its monthly hours.
  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }
}
