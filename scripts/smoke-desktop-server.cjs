const { spawn } = require('node:child_process');
const { mkdtempSync, realpathSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
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
  const buildDir = process.env.HABITFLOW_SMOKE_BUILD_DIR === '.next-e2e' ? '.next-e2e' : '.next';
  const dataRoot = mkdtempSync(path.join(tmpdir(), 'habitflow-smoke-'));
  const database = await startEmbeddedDatabase(path.join(dataRoot, 'server-smoke-db'), path.join(packageRoot, 'lib/db/migrations'));
  let child;
  try {
    const port = await freeLoopbackPort();
    const origin = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [path.join(packageRoot, buildDir, 'standalone/server.js')], {
      cwd: path.join(packageRoot, buildDir, 'standalone'),
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
    for (const route of ['/today', '/week', '/goals', '/review', '/dashboard', '/api/export']) {
      const response = await fetch(`${origin}${route}`, { headers: { Cookie: cookies }, redirect: 'manual' });
      if (response.status !== 200) throw new Error(`Authenticated ${route} failed: HTTP ${response.status}`);
      if (route === '/api/export') {
        const backup = await response.json();
        if (backup.schemaVersion !== 1 || !Array.isArray(backup.habits) || 'account' in backup || 'session' in backup) throw new Error('Backup schema or privacy check failed');
      }
    }
    console.log('Embedded database, migrations, health, registration, main routes, and export OK');
  } finally {
    if (child && child.exitCode === null) child.kill();
    await database.close();
    const resolved = realpathSync(dataRoot);
    if (path.dirname(resolved) !== realpathSync(tmpdir()) || !path.basename(resolved).startsWith('habitflow-smoke-')) throw new Error('Unsafe smoke cleanup path');
    rmSync(resolved, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
