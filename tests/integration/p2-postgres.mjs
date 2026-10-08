import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.HABITFLOW_TEST_ADMIN_URL;
if (!url) throw new Error('Set HABITFLOW_TEST_ADMIN_URL to a local PostgreSQL admin database.');
const parsed = new URL(url);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname))
  throw new Error('A local test server is required.');
const connection = {
  host: parsed.hostname.replace(/^\[|\]$/g, ''),
  port: Number(parsed.port || 5432),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
};
const admin = postgres({ ...connection, database: parsed.pathname.slice(1), max: 1 });
const name = `habitflow_p2_test_${randomUUID().replaceAll('-', '')}`;
let created = false;
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  created = true;
  const sql = postgres({ ...connection, database: name, max: 2 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: 'lib/db/migrations' });
    await sql`INSERT INTO "user" (id, name, email) VALUES ('owner', 'Owner', 'owner-p2@example.test'), ('other', 'Other', 'other-p2@example.test')`;
    const [plan] =
      await sql`INSERT INTO time_off_days (user_id, date, type, note) VALUES ('owner', '2026-10-10', 'Travel', 'Private') RETURNING id`;
    await assert.rejects(
      sql`INSERT INTO time_off_days (user_id, date, type) VALUES ('owner', '2026-10-10', 'Recovery')`,
    );
    const [block] =
      await sql`INSERT INTO time_blocks (user_id, title, category, local_start_time, local_end_time, weekday_mask, start_date) VALUES ('owner', 'Focus', 'Career', '11:00', '12:00', '0000010', '2026-10-10') RETURNING id`;
    await sql`INSERT INTO time_block_exceptions (user_id, block_id, occurrence_date, status, time_off_id) VALUES ('owner', ${block.id}, '2026-10-10', 'excused', ${plan.id})`;
    await assert.rejects(
      sql`UPDATE time_block_exceptions SET user_id = 'other' WHERE block_id = ${block.id}`,
    );
    const [foreignBlock] =
      await sql`INSERT INTO time_blocks (user_id, title, category, local_start_time, local_end_time, weekday_mask, start_date) VALUES ('other', 'Other', 'Career', '11:00', '12:00', '0000010', '2026-10-10') RETURNING id`;
    await assert.rejects(
      sql`INSERT INTO time_block_exceptions (user_id, block_id, occurrence_date, status, time_off_id) VALUES ('other', ${foreignBlock.id}, '2026-10-10', 'excused', ${plan.id})`,
    );
    const [habit] =
      await sql`INSERT INTO habits (user_id, name, schedule, start_date) VALUES ('owner', 'Read', 'daily', '2026-10-08') RETURNING id`;
    await assert.rejects(
      sql`INSERT INTO day_plans (user_id, date, minimum_habit_id, minimum_action) VALUES ('other', '2026-10-08', ${habit.id}, 'Read two pages')`,
    );
    await sql`INSERT INTO day_plans (user_id, date, minimum_habit_id, minimum_action, minimum_action_done) VALUES ('owner', '2026-10-08', ${habit.id}, 'Read two pages', true)`;
    const entries = await sql`SELECT * FROM habit_entries WHERE user_id = 'owner'`;
    assert.equal(entries.length, 0);
    const [saved] = await sql`SELECT minimum_action_done FROM day_plans WHERE user_id = 'owner'`;
    assert.equal(saved.minimum_action_done, true);
    await sql`INSERT INTO user_settings (user_id, flexible_capacity_minutes) VALUES ('owner', 45)`;
    const [capacity] =
      await sql`SELECT flexible_capacity_minutes FROM user_settings WHERE user_id = 'owner'`;
    assert.equal(capacity.flexible_capacity_minutes, 45);
    console.log(
      'P2 PostgreSQL fresh migrations, duplicate prevention, owner FKs, and minimum-action separation: PASS',
    );
  } finally {
    await sql.end();
  }
} finally {
  if (created) await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
}
