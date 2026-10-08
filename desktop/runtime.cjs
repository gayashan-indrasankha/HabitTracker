const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const { drizzle } = require('drizzle-orm/pglite');
const { migrate } = require('drizzle-orm/pglite/migrator');
const { createServer } = require('node:net');

async function freeLoopbackPort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function startEmbeddedDatabase(dataDir, migrationsFolder, options = {}) {
  const client = new PGlite(dataDir);
  try {
    await migrate(drizzle({ client }), { migrationsFolder });
    const port = options.port ?? await freeLoopbackPort();
    const socket = new PGLiteSocketServer({ db: client, host: '127.0.0.1', port, maxConnections: 12 });
    await socket.start();
    return {
      url: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`,
      async close() { await socket.stop(); await client.close(); },
    };
  } catch (error) {
    await client.close();
    throw error;
  }
}

module.exports = { startEmbeddedDatabase, freeLoopbackPort };
