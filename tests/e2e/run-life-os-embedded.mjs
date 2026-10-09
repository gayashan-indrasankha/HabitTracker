import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { startEmbeddedDatabase } = require('../../desktop/runtime.cjs');
const dir = await mkdtemp(join(tmpdir(), 'habitflow-life-os-e2e-'));
const selectedSpecs = process.argv.slice(2);
let database;
try {
  database = await startEmbeddedDatabase(dir, 'lib/db/migrations');
  const env = {
    ...process.env,
    DATABASE_URL: database.url,
    BETTER_AUTH_URL: 'http://localhost:3100',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
    BETTER_AUTH_SECRET: 'isolated-life-os-browser-test-secret-123456789',
    HABITFLOW_E2E_ISOLATED: '1',
    HABITFLOW_EMBEDDED_DB: '1',
    HABITFLOW_TEST_NOW: process.env.HABITFLOW_TEST_NOW ?? '2026-10-09T06:00:00Z',
  };
  const code = await new Promise((resolveCode, reject) => {
    const child = spawn(
      process.execPath,
      [
        'node_modules/playwright/cli.js',
        'test',
        ...(selectedSpecs.length
          ? selectedSpecs
          : ['tests/e2e/template-refinement.spec.ts', 'tests/e2e/daily-usability.spec.ts']),
      ],
      { env, stdio: 'inherit' },
    );
    child.once('error', reject);
    child.once('exit', (exitCode) => resolveCode(exitCode ?? 1));
  });
  if (code !== 0) process.exitCode = code;
} finally {
  if (database) await database.close();
  const absolute = resolve(dir);
  if (!absolute.startsWith(resolve(tmpdir()) + sep))
    throw new Error('Unsafe test database cleanup path.');
  await rm(absolute, { recursive: true, force: true });
}
