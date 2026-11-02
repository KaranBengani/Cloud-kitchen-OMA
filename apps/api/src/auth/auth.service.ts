import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Env } from '../config/env.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly jwt: JwtService,
  ) {}

  async login(pin: string): Promise<{ token: string }> {
    if (!this.pinMatches(pin)) throw new UnauthorizedException('Wrong PIN');
    // One shared family identity (DECISIONS.md D4). Rotating JWT_SECRET logs every phone out.
    return { token: await this.jwt.signAsync({ sub: 'family' }) };
  }

  // Constant-time comparison: a plain === returns faster on an early mismatch,
  // which can leak how many leading digits were right. Hashing first makes both sides equal length.
  private pinMatches(pin: string): boolean {
    const hash = (s: string) => createHash('sha256').update(s).digest();
    return timingSafeEqual(hash(pin), hash(this.config.get('AUTH_PIN', { infer: true })));
  }
}
