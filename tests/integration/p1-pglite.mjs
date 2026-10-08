import assert from 'node:assert/strict';
import { copyFile, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { sql } from 'drizzle-orm';

const migrations = 'lib/db/migrations';
const old = await mkdtemp(join(tmpdir(), 'habitflow-p1-pglite-'));
const client = new PGlite();
try {
  for (const file of await readdir(migrations))
    if (/^000[0-7]_.*\.sql$/.test(file)) await copyFile(join(migrations, file), join(old, file));
  await mkdir(join(old, 'meta'));
  const journal = JSON.parse(await readFile(join(migrations, 'meta', '_journal.json'), 'utf8'));
  journal.entries = journal.entries.slice(0, 8);
  await writeFile(join(old, 'meta', '_journal.json'), JSON.stringify(journal));
  const db = drizzle({ client });
  await migrate(db, { migrationsFolder: old });
  await client.query("INSERT INTO \"user\" (id, name, email) VALUES ('owner', 'Owner', 'owner-p1-pglite@example.test')");
  const goal = await client.query("INSERT INTO goals (user_id, area, title) VALUES ('owner', 'Career', 'Portfolio') RETURNING id");
  const block = await client.query("INSERT INTO time_blocks (user_id, title, category, local_start_time, local_end_time, weekday_mask, start_date, goal_id, is_fixed) VALUES ('owner', 'Study', 'Career', '09:00', '10:00', '1000000', '2026-10-05', $1, true) RETURNING id", [goal.rows[0].id]);
  await client.query("INSERT INTO time_block_revisions (user_id, block_id, effective_date, title, category, local_start_time, local_end_time, weekday_mask, status) VALUES ('owner', $1, '2026-10-05', 'Study', 'Career', '09:00', '10:00', '1000000', 'active')", [block.rows[0].id]);
  await migrate(db, { migrationsFolder: migrations });
  const revision = await client.query('SELECT goal_id, is_fixed FROM time_block_revisions WHERE block_id = $1', [block.rows[0].id]);
  assert.equal(revision.rows[0].goal_id, goal.rows[0].id);
  assert.equal(revision.rows[0].is_fixed, true);
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'habitflow-schedule:owner'}, 0))`);
    await tx.execute(sql`UPDATE goals SET archived_at = now() WHERE id = ${goal.rows[0].id}`);
  });
  const archived = await client.query('SELECT archived_at FROM goals WHERE id = $1', [goal.rows[0].id]);
  assert.ok(archived.rows[0].archived_at);
  console.log('PGlite P1 existing-schema upgrade, revision metadata, archive, and transaction lock: PASS');
} finally {
  await client.close();
  await rm(old, { recursive: true, force: true });
}
