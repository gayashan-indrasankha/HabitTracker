import type { Config } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';
import { parseServerEnv } from './lib/env';

loadEnvConfig(process.cwd());
const env = parseServerEnv(process.env);

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL || env.DATABASE_URL,
  },
} satisfies Config;
