// Every environment variable the API reads, validated once at startup.
// A missing or malformed value crashes the boot instead of failing later on a request.
export interface Env {
  PORT: number;
  DATABASE_URL: string;
  AUTH_PIN: string;
  JWT_SECRET: string;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const errors: string[] = [];
  const str = (key: string): string => {
    const value = raw[key];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${key} is required`);
      return '';
    }
    return value;
  };

  const env: Env = {
    PORT: Number(raw.PORT ?? 3000),
    DATABASE_URL: str('DATABASE_URL'),
    AUTH_PIN: str('AUTH_PIN'),
    JWT_SECRET: str('JWT_SECRET'),
  };

  if (env.AUTH_PIN && !/^\d{6}$/.test(env.AUTH_PIN)) errors.push('AUTH_PIN must be exactly 6 digits');
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) errors.push('JWT_SECRET must be at least 32 characters');
  if (Number.isNaN(env.PORT)) errors.push('PORT must be a number');

  if (errors.length) throw new Error(`Invalid environment:\n- ${errors.join('\n- ')}`);
  return env;
}
