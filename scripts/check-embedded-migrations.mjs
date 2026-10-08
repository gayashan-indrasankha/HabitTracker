import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const client = new PGlite();
try {
  await migrate(drizzle({ client }), { migrationsFolder: 'lib/db/migrations' });
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  for (const name of ['habits', 'goals', 'projects', 'tasks', 'time_blocks', 'time_block_exceptions', 'weekly_reviews', 'metric_entries', 'subject_assessments']) {
    if (!tables.rows.some(row => row.tablename === name)) throw new Error(`Missing table: ${name}`);
  }
  await client.query("INSERT INTO \"user\" (id, name, email) VALUES ('first', 'First', 'first@example.test'), ('second', 'Second', 'second@example.test')");
  const habit = await client.query("INSERT INTO habits (user_id, name, start_date) VALUES ('first', 'Read', '2026-10-01') RETURNING id");
  async function mustReject(query, params) {
    try { await client.query(query, params); } catch { return; }
    throw new Error('Cross-user foreign key unexpectedly accepted');
  }
  await mustReject("INSERT INTO habit_entries (habit_id, user_id, date) VALUES ($1, 'second', '2026-10-02')", [habit.rows[0].id]);
  const goal = await client.query("INSERT INTO goals (user_id, area, title) VALUES ('first', 'Career', 'Portfolio') RETURNING id");
  await mustReject("INSERT INTO projects (user_id, goal_id, name) VALUES ('second', $1, 'Foreign project')", [goal.rows[0].id]);
  await client.query("INSERT INTO goals (user_id, area, title, template_key) VALUES ('first', 'Career', 'Template', 'career') ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO goals (user_id, area, title, template_key) VALUES ('first', 'Career', 'Template', 'career') ON CONFLICT DO NOTHING");
  const templates = await client.query("SELECT count(*)::int AS count FROM goals WHERE user_id = 'first' AND template_key = 'career'");
  if (templates.rows[0].count !== 1) throw new Error('Template key allowed a duplicate');
  const subject = await client.query("INSERT INTO subjects (user_id, slot, name) VALUES ('first', 1, 'Subject') RETURNING id");
  await mustReject("INSERT INTO subject_assessments (user_id, subject_id, title) VALUES ('second', $1, 'Foreign assessment')", [subject.rows[0].id]);
  console.log('Embedded migrations passed');
} finally {
  await client.close();
}
