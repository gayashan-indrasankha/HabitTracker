import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const adminUrl = process.env.HABITFLOW_TEST_ADMIN_URL;
if (!adminUrl)
  throw new Error('Set HABITFLOW_TEST_ADMIN_URL to a local PostgreSQL admin database.');
const parsed = new URL(adminUrl);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname))
  throw new Error('A local test server is required.');
const connection = {
  host: parsed.hostname.replace(/^\[|\]$/g, ''),
  port: Number(parsed.port || 5432),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
};
const admin = postgres({ ...connection, database: parsed.pathname.slice(1), max: 1 });
const name = `habitflow_p0_e2e_${randomUUID().replaceAll('-', '')}`;
let created = false;
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  created = true;
  const sql = postgres({ ...connection, database: name, max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: 'lib/db/migrations' });
  } finally {
    await sql.end();
  }
  const testUrl = new URL(adminUrl);
  testUrl.hostname = 'localhost';
  testUrl.pathname = `/${name}`;
  const env = {
    ...process.env,
    DATABASE_URL: testUrl.toString(),
    BETTER_AUTH_URL: 'http://localhost:3100',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
    BETTER_AUTH_SECRET: 'isolated-scheduling-test-secret-123456789',
    HABITFLOW_E2E_ISOLATED: '1',
    HABITFLOW_TEST_NOW: process.env.HABITFLOW_TEST_NOW ?? '2026-10-08T12:30:00Z',
  };
  const code = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        'node_modules/playwright/cli.js',
        'test',
        ...(process.argv.slice(2).length ? process.argv.slice(2) : ['tests/e2e']),
      ],
      { env, stdio: 'inherit' },
    );
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  if (code !== 0) process.exitCode = code;
} finally {
  if (created) await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
}
