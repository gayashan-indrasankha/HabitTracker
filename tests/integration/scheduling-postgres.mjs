import assert from 'node:assert/strict';
import { mkdtemp, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const adminUrl = process.env.HABITFLOW_TEST_ADMIN_URL;
if (!adminUrl)
  throw new Error('Set HABITFLOW_TEST_ADMIN_URL to a local disposable PostgreSQL server.');
const parsed = new URL(adminUrl);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname))
  throw new Error('Test database must be local.');
const host = parsed.hostname.replace(/^\[|\]$/g, '');
const connection = {
  host,
  port: Number(parsed.port || 5432),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
};
const admin = postgres({ ...connection, database: parsed.pathname.slice(1), max: 1 });
const created = [];
const oldMigrations = await mkdtemp(join(tmpdir(), 'habitflow-old-migrations-'));
try {
  const folder = 'lib/db/migrations';
  for (let i = 0; i <= 6; i++) {
    const name = (await (await import('node:fs/promises')).readdir(folder)).find(
      (item) => item.startsWith(`${String(i).padStart(4, '0')}_`) && item.endsWith('.sql'),
    );
    assert.ok(name);
    await copyFile(join(folder, name), join(oldMigrations, name));
  }
  await (await import('node:fs/promises')).mkdir(join(oldMigrations, 'meta'));
  const journal = JSON.parse(await readFile(join(folder, 'meta', '_journal.json'), 'utf8'));
  journal.entries = journal.entries.slice(0, 7);
  await writeFile(join(oldMigrations, 'meta', '_journal.json'), JSON.stringify(journal));

  for (const upgrade of [false, true]) {
    const name = `habitflow_p0_test_${crypto.randomUUID().replaceAll('-', '')}`;
    await admin.unsafe(`CREATE DATABASE "${name}"`);
    created.push(name);
    const sql = postgres({ ...connection, database: name, max: 2 });
    try {
      const [database] = await sql`SELECT current_database() AS name`;
      assert.equal(database.name, name);
      if (upgrade) {
        await migrate(drizzle(sql), { migrationsFolder: oldMigrations });
        await sql`INSERT INTO "user" (id, name, email) VALUES ('owner', 'Owner', 'owner@example.test'), ('other', 'Other', 'other@example.test')`;
        await sql`INSERT INTO time_blocks (user_id, title, category, local_start_time, local_end_time, weekday_mask, start_date, status)
          VALUES ('owner', 'Study', 'University', '09:00', '10:00', '1000000', '2026-10-01', 'active')`;
        await sql`INSERT INTO time_block_exceptions (user_id, block_id, occurrence_date, status)
          SELECT 'owner', id, '2026-10-05', 'completed' FROM time_blocks WHERE user_id = 'owner'`;
      }
      await migrate(drizzle(sql), { migrationsFolder: folder });
      if (!upgrade) {
        await sql`INSERT INTO "user" (id, name, email) VALUES ('owner', 'Owner', 'owner@example.test'), ('other', 'Other', 'other@example.test')`;
        await sql`INSERT INTO time_blocks (user_id, title, category, local_start_time, local_end_time, weekday_mask, start_date, status)
          VALUES ('owner', 'Study', 'University', '09:00', '10:00', '1000000', '2026-10-01', 'active')`;
      }
      const [block] = await sql`SELECT id FROM time_blocks WHERE user_id = 'owner'`;
      if (upgrade) {
        const base = await sql`SELECT * FROM time_block_revisions WHERE block_id = ${block.id}`;
        assert.equal(base.length, 1);
        assert.equal(base[0].local_start_time, '09:00');
        const old = await sql`SELECT * FROM time_block_exceptions WHERE block_id = ${block.id}`;
        assert.equal(old.length, 1);
      } else {
        await sql`INSERT INTO time_block_revisions (user_id, block_id, effective_date, title, category, local_start_time, local_end_time, weekday_mask, status)
          VALUES ('owner', ${block.id}, '2026-10-01', 'Study', 'University', '09:00', '10:00', '1000000', 'active')`;
      }
      await sql`INSERT INTO time_block_revisions (user_id, block_id, effective_date, title, category, local_start_time, local_end_time, weekday_mask, status)
        VALUES ('owner', ${block.id}, '2026-10-12', 'Study', 'University', '14:00', '15:00', '1000000', 'active')`;
      const history =
        await sql`SELECT local_start_time FROM time_block_revisions WHERE block_id = ${block.id} ORDER BY effective_date`;
      assert.deepEqual(
        history.map((item) => item.local_start_time),
        ['09:00', '14:00'],
      );
      await assert.rejects(sql`INSERT INTO time_block_revisions (user_id, block_id, effective_date, title, category, local_start_time, local_end_time, weekday_mask, status)
        VALUES ('other', ${block.id}, '2026-10-19', 'Foreign', 'University', '14:00', '15:00', '1000000', 'active')`);
      const inserted =
        await sql`INSERT INTO time_block_exceptions (user_id, block_id, occurrence_date, status, reason)
        VALUES ('owner', ${block.id}, '2026-10-12', 'skipped', 'Ill') RETURNING id`;
      assert.equal(inserted.length, 1);
      await sql`UPDATE time_block_exceptions SET status = 'planned', reason = NULL WHERE id = ${inserted[0].id}`;
      await sql`UPDATE time_block_exceptions SET status = 'planned' WHERE id = ${inserted[0].id}`;
      const restored =
        await sql`SELECT status FROM time_block_exceptions WHERE id = ${inserted[0].id}`;
      assert.deepEqual(
        restored.map((item) => item.status),
        ['planned'],
      );
      assert.equal(
        (
          await sql`SELECT * FROM time_block_exceptions WHERE user_id = 'other' AND block_id = ${block.id}`
        ).length,
        0,
      );
      const foreignUpdate =
        await sql`UPDATE time_block_exceptions SET status = 'completed' WHERE user_id = 'other' AND id = ${inserted[0].id} RETURNING id`;
      assert.equal(foreignUpdate.length, 0);
      await assert.rejects(sql`INSERT INTO time_block_exceptions (user_id, block_id, occurrence_date, status)
        VALUES ('other', ${block.id}, '2026-10-19', 'completed')`);
      await assert.rejects(sql`INSERT INTO time_block_exceptions (user_id, block_id, occurrence_date, status)
        VALUES ('owner', ${block.id}, '2026-10-12', 'skipped')`);
    } finally {
      await sql.end();
    }
  }
  console.log('PostgreSQL fresh and upgrade scheduling migrations passed');
} finally {
  for (const name of created) await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.end();
  await rm(oldMigrations, { recursive: true, force: true });
}
