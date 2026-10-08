import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { parseServerEnv } from '@/lib/env';

const env = parseServerEnv(process.env);

// Prevent multiple instances in development (HMR)
const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined;
};

const connection =
  globalForDb.connection ??
  postgres(env.DATABASE_URL, {
    max: process.env.NODE_ENV === 'production' ? 1 : 10,
    connect_timeout: 10,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.connection = connection;
}

export const db = drizzle(connection, { schema });
export type DB = typeof db;
