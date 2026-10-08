import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import postgres from 'postgres';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { startEmbeddedDatabase } = require('../../desktop/runtime.cjs');
const root = await mkdtemp(join(tmpdir(), 'habitflow-pglite-persistence-'));
try {
  for (const iteration of [1, 2]) {
    const database = await startEmbeddedDatabase(join(root, 'database'), 'lib/db/migrations');
    const sql = postgres(database.url, { max: 1 });
    try {
      if (iteration === 1) {
        await sql`INSERT INTO "user" (id,name,email) VALUES ('persistence-owner','Owner','persistence@example.test')`;
        await sql`INSERT INTO habits (user_id,name,start_date) VALUES ('persistence-owner','Persistent habit','2026-10-08')`;
        await sql`INSERT INTO habit_entries (user_id,habit_id,date) SELECT 'persistence-owner',id,'2026-10-08' FROM habits WHERE user_id='persistence-owner'`;
      } else {
        const [result] =
          await sql`SELECT count(*)::int AS count FROM habit_entries WHERE user_id='persistence-owner'`;
        assert.equal(result.count, 1);
        const [habit] =
          await sql`SELECT name,start_date FROM habits WHERE user_id='persistence-owner'`;
        assert.equal(habit.name, 'Persistent habit');
        assert.equal(habit.start_date.toISOString().slice(0, 10), '2026-10-08');
      }
    } finally {
      await sql.end();
      await database.close();
    }
  }
  console.log('Persistent PGlite close/reopen and migration reapplication: PASS');
} finally {
  const resolved = await realpath(root);
  if (
    dirname(resolved) !== (await realpath(tmpdir())) ||
    !basename(resolved).startsWith('habitflow-pglite-persistence-')
  )
    throw new Error('Unsafe persistence test cleanup path.');
  await rm(resolved, { recursive: true, force: true });
}
