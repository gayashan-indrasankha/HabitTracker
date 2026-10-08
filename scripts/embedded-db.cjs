const path = require('node:path');
const { loadEnvConfig } = require('@next/env');
const { startEmbeddedDatabase } = require('../desktop/runtime.cjs');

const root = path.resolve(__dirname, '..');
loadEnvConfig(root);

async function main() {
  const configuredUrl = process.env.DATABASE_URL;
  if (!configuredUrl) throw new Error('DATABASE_URL is missing from .env.local.');

  const url = new URL(configuredUrl);
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('The embedded database requires a local DATABASE_URL.');
  }

  const port = Number(url.port || 5432);
  const database = await startEmbeddedDatabase(
    path.join(root, '.local-embedded-db'),
    path.join(root, 'lib/db/migrations'),
    { port },
  );

  console.log(`Embedded database ready on 127.0.0.1:${port}. Keep this terminal open.`);
  console.log(
    'Data is stored in .local-embedded-db/ and is separate from Docker and desktop data.',
  );

  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    await database.close();
  }
  process.once('SIGINT', () => {
    void close();
  });
  process.once('SIGTERM', () => {
    void close();
  });
}

main().catch((error) => {
  console.error('Could not start the embedded database:', error);
  process.exitCode = 1;
});
