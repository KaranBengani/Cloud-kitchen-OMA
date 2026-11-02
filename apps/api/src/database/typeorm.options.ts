import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

// Shared by the running app (app.module.ts) and the migration CLI (data-source.ts),
// so both always point at the same entities and migrations.
// Globs match compiled .js files: migrations run from dist/, never from TypeScript source.
export function typeormOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [join(import.meta.dirname, '..', '**', '*.entity.js')],
    migrations: [join(import.meta.dirname, 'migrations', '*.js')],
    // Never let TypeORM alter tables on boot: it can drop columns holding real data.
    // Schema changes only happen through reviewed migrations.
    synchronize: false,
    migrationsRun: false,
  };
}
