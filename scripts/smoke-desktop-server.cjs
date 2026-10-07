const { spawn } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { startEmbeddedDatabase, freeLoopbackPort } = require('../desktop/runtime.cjs');

async function waitForHealthy(origin, child) {
  let last = 'no response';
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error('Server stopped before becoming healthy.');
    try {
      const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
      last = `HTTP ${response.status}`;
    } catch (error) { last = error instanceof Error ? error.message : 'connection failed'; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Server health check timed out (${last}).`);
}

async function main() {
  const packageRoot = process.env.HABITFLOW_SMOKE_ROOT ? path.resolve(process.env.HABITFLOW_SMOKE_ROOT) : path.resolve();
  const dataRoot = path.resolve('.desktop-test');
  mkdirSync(dataRoot, { recursive: true });
  const database = await startEmbeddedDatabase(path.join(dataRoot, 'server-smoke-db'), path.join(packageRoot, 'lib/db/migrations'));
  let child;
  try {
    const port = await freeLoopbackPort();
    const origin = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [path.join(packageRoot, '.next/standalone/server.js')], {
      cwd: path.join(packageRoot, '.next/standalone'),
      windowsHide: true,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production', VERCEL_ENV: '', HOSTNAME: '127.0.0.1', PORT: String(port), DATABASE_URL: database.url, BETTER_AUTH_URL: origin, NEXT_PUBLIC_APP_URL: origin, BETTER_AUTH_SECRET: crypto.randomBytes(48).toString('base64url') },
    });
    await waitForHealthy(origin, child);
    const response = await fetch(`${origin}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ name: 'Desktop Smoke', email: `desktop-${crypto.randomUUID()}@example.test`, password: 'Desktop-smoke-password-42' }),
    });
    if (!response.ok) throw new Error(`Registration failed: HTTP ${response.status}`);
    const cookies = response.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ');
    if (!cookies) throw new Error('Registration returned no session cookie.');
    const dashboard = await fetch(`${origin}/dashboard`, { headers: { Cookie: cookies }, redirect: 'manual' });
    if (dashboard.status !== 200) throw new Error(`Authenticated dashboard failed: HTTP ${dashboard.status}`);
    console.log('Embedded database, migrations, health, registration, and authenticated dashboard OK');
  } finally {
    if (child && child.exitCode === null) child.kill();
    await database.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
