import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../config/env.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const config = { get: () => '123456' } as unknown as ConfigService<Env, true>;
  const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '180d' } });
  const service = new AuthService(config, jwt);

  it('returns a verifiable family token for the right PIN', async () => {
    const { token } = await service.login('123456');
    await expect(jwt.verifyAsync(token)).resolves.toMatchObject({ sub: 'family' });
  });

  it('rejects a wrong PIN', async () => {
    await expect(service.login('654321')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
