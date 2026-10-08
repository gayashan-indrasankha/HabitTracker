import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const client = new PGlite();
try {
  await migrate(drizzle({ client }), { migrationsFolder: 'lib/db/migrations' });
  await client.query(
    "INSERT INTO \"user\" (id, name, email) VALUES ('owner', 'Owner', 'owner-p2-pglite@example.test'), ('other', 'Other', 'other-p2-pglite@example.test')",
  );
  const plan = await client.query(
    "INSERT INTO time_off_days (user_id, date, type) VALUES ('owner', '2026-10-10', 'Travel') RETURNING id",
  );
  await assert.rejects(
    client.query(
      "INSERT INTO time_off_days (user_id, date, type) VALUES ('owner', '2026-10-10', 'Social')",
    ),
  );
  const block = await client.query(
    "INSERT INTO time_blocks (user_id, title, category, local_start_time, local_end_time, weekday_mask, start_date) VALUES ('owner', 'Focus', 'Career', '11:00', '12:00', '0000010', '2026-10-10') RETURNING id",
  );
  await client.query(
    "INSERT INTO time_block_exceptions (user_id, block_id, occurrence_date, status, time_off_id) VALUES ('owner', $1, '2026-10-10', 'excused', $2)",
    [block.rows[0].id, plan.rows[0].id],
  );
  await assert.rejects(
    client.query("UPDATE time_block_exceptions SET user_id = 'other' WHERE block_id = $1", [
      block.rows[0].id,
    ]),
  );
  const habit = await client.query(
    "INSERT INTO habits (user_id, name, schedule, start_date) VALUES ('owner', 'Read', 'daily', '2026-10-08') RETURNING id",
  );
  await assert.rejects(
    client.query(
      "INSERT INTO day_plans (user_id, date, minimum_habit_id) VALUES ('other', '2026-10-08', $1)",
      [habit.rows[0].id],
    ),
  );
  await client.query(
    "INSERT INTO day_plans (user_id, date, minimum_habit_id, minimum_action, minimum_action_done) VALUES ('owner', '2026-10-08', $1, 'Read two pages', true)",
    [habit.rows[0].id],
  );
  const entries = await client.query("SELECT * FROM habit_entries WHERE user_id = 'owner'");
  assert.equal(entries.rows.length, 0);
  console.log(
    'P2 PGlite fresh migrations, duplicate prevention, owner FKs, and minimum-action separation: PASS',
  );
} finally {
  await client.close();
}
