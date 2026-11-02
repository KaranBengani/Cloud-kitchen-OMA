import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgres://localhost/oma',
  AUTH_PIN: '123456',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a complete environment and defaults PORT', () => {
    expect(validateEnv(valid)).toEqual({ ...valid, PORT: 3000 });
  });

  it('lists every problem at once', () => {
    expect(() => validateEnv({ AUTH_PIN: '12', JWT_SECRET: 'short' })).toThrow(
      /DATABASE_URL is required[\s\S]*AUTH_PIN must be exactly 6 digits[\s\S]*JWT_SECRET must be at least 32/,
    );
  });
});
