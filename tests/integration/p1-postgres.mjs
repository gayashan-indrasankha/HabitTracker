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
const database = `habitflow_p1_test_${randomUUID().replaceAll('-', '')}`;
let created = false;
try {
  await admin.unsafe(`CREATE DATABASE "${database}"`);
  created = true;
  const sql = postgres({ ...connection, database, max: 4 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: 'lib/db/migrations' });
    await sql`INSERT INTO "user" (id, name, email) VALUES ('owner', 'Owner', 'owner-p1@example.test'), ('other', 'Other', 'other-p1@example.test')`;
    const [goal] =
      await sql`INSERT INTO goals (user_id, area, title, template_key) VALUES ('owner', 'Career', 'Original', 'template-goal') RETURNING id`;
    const [otherGoal] =
      await sql`INSERT INTO goals (user_id, area, title) VALUES ('other', 'Career', 'Other') RETURNING id`;
    const [project] =
      await sql`INSERT INTO projects (user_id, goal_id, name, template_key) VALUES ('owner', ${goal.id}, 'Portfolio', 'template-project') RETURNING id`;
    const [task] =
      await sql`INSERT INTO tasks (user_id, goal_id, project_id, title, scheduled_date, daily_priority) VALUES ('owner', ${goal.id}, ${project.id}, 'First', '2026-10-08', 1) RETURNING id`;

    const foreignEdit =
      await sql`UPDATE goals SET title = 'Stolen' WHERE user_id = 'other' AND id = ${goal.id} RETURNING id`;
    assert.equal(foreignEdit.length, 0);
    await sql`UPDATE goals SET area = 'University', title = 'Edited', description = NULL, target_date = '2026-12-01', archived_at = now() WHERE user_id = 'owner' AND id = ${goal.id}`;
    const [editedGoal] =
      await sql`SELECT title, description, template_key, archived_at FROM goals WHERE id = ${goal.id}`;
    assert.equal(editedGoal.title, 'Edited');
    assert.equal(editedGoal.description, null);
    assert.equal(editedGoal.template_key, 'template-goal');
    assert.ok(editedGoal.archived_at);
    await assert.rejects(
      sql`UPDATE projects SET goal_id = ${otherGoal.id} WHERE id = ${project.id}`,
    );
    await sql`UPDATE projects SET goal_id = NULL, repository_url = 'https://example.com/repo', archived_at = now() WHERE user_id = 'owner' AND id = ${project.id}`;
    const [editedProject] =
      await sql`SELECT goal_id, template_key, archived_at FROM projects WHERE id = ${project.id}`;
    assert.equal(editedProject.goal_id, null);
    assert.equal(editedProject.template_key, 'template-project');
    assert.ok(editedProject.archived_at);
    const [linkedTask] =
      await sql`SELECT goal_id, project_id, status FROM tasks WHERE id = ${task.id}`;
    assert.equal(linkedTask.goal_id, goal.id);
    assert.equal(linkedTask.project_id, project.id);
    assert.equal(linkedTask.status, 'todo');
    await sql`UPDATE goals SET archived_at = NULL WHERE id = ${goal.id}`;
    await sql`UPDATE projects SET archived_at = NULL WHERE id = ${project.id}`;

    const [second] =
      await sql`INSERT INTO tasks (user_id, title, scheduled_date, daily_priority) VALUES ('owner', 'Second', '2026-10-08', 2) RETURNING id`;
    const [third] =
      await sql`INSERT INTO tasks (user_id, title, scheduled_date, daily_priority) VALUES ('owner', 'Third', '2026-10-08', 3) RETURNING id`;
    const [replacement] =
      await sql`INSERT INTO tasks (user_id, title) VALUES ('owner', 'Replacement') RETURNING id`;
    await assert.rejects(sql`UPDATE tasks SET daily_priority = 1 WHERE id = ${second.id}`);
    await sql.begin(async (tx) => {
      await tx`SELECT id FROM "user" WHERE id = 'owner' FOR UPDATE`;
      await tx`UPDATE tasks SET daily_priority = NULL WHERE user_id = 'owner' AND scheduled_date = '2026-10-08'`;
      await tx`UPDATE tasks SET daily_priority = 2 WHERE id = ${task.id}`;
      await tx`UPDATE tasks SET daily_priority = 1 WHERE id = ${second.id}`;
      await tx`UPDATE tasks SET daily_priority = 3 WHERE id = ${third.id}`;
    });
    await sql.begin(async (tx) => {
      await tx`SELECT id FROM "user" WHERE id = 'owner' FOR UPDATE`;
      await tx`UPDATE tasks SET daily_priority = NULL WHERE id = ${task.id}`;
      await tx`UPDATE tasks SET scheduled_date = '2026-10-08', daily_priority = 2 WHERE id = ${replacement.id}`;
    });
    const ranks =
      await sql`SELECT title, daily_priority FROM tasks WHERE user_id = 'owner' AND scheduled_date = '2026-10-08' AND daily_priority IS NOT NULL ORDER BY daily_priority`;
    assert.deepEqual(
      ranks.map((row) => [row.title, row.daily_priority]),
      [
        ['Second', 1],
        ['Replacement', 2],
        ['Third', 3],
      ],
    );
    const [displaced] =
      await sql`SELECT status, project_id, goal_id, daily_priority FROM tasks WHERE id = ${task.id}`;
    assert.equal(displaced.daily_priority, null);
    assert.equal(displaced.status, 'todo');
    assert.equal(displaced.project_id, project.id);
    assert.equal(displaced.goal_id, goal.id);

    const reorder = async (first, second) =>
      sql.begin(async (tx) => {
        await tx`SELECT id FROM "user" WHERE id = 'owner' FOR UPDATE`;
        const current =
          await tx`SELECT id FROM tasks WHERE user_id = 'owner' AND scheduled_date = '2026-10-08' AND daily_priority IS NOT NULL ORDER BY daily_priority`;
        await tx`UPDATE tasks SET daily_priority = NULL WHERE user_id = 'owner' AND scheduled_date = '2026-10-08'`;
        const ids = current.map((row) => row.id);
        [ids[first], ids[second]] = [ids[second], ids[first]];
        for (let index = 0; index < ids.length; index++)
          await tx`UPDATE tasks SET daily_priority = ${index + 1} WHERE id = ${ids[index]}`;
      });
    await Promise.all([reorder(0, 1), reorder(1, 2)]);
    const final =
      await sql`SELECT daily_priority FROM tasks WHERE user_id = 'owner' AND scheduled_date = '2026-10-08' AND daily_priority IS NOT NULL ORDER BY daily_priority`;
    assert.deepEqual(
      final.map((row) => row.daily_priority),
      [1, 2, 3],
    );
    console.log(
      'P1 PostgreSQL persistence, ownership constraints, archive, swap, replacement, and concurrent rank operations: PASS',
    );
  } finally {
    await sql.end();
  }
} finally {
  if (created) await admin.unsafe(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await admin.end();
}
