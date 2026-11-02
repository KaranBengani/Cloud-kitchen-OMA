import { DataSource } from 'typeorm';
import { typeormOptions } from './typeorm.options.js';

// Entry point for the TypeORM CLI (migration:generate / run / revert). See package.json scripts.
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

export default new DataSource(typeormOptions(url));
