import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const source = 'lib/db/migrations';
const temp = await mkdtemp(join(tmpdir(), 'habitflow-refinement-'));
const client = new PGlite();
try {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(join(temp, 'meta'));
  const journal = JSON.parse(await readFile(join(source, 'meta', '_journal.json'), 'utf8'));
  journal.entries = journal.entries.filter((entry) => entry.idx <= 13);
  await writeFile(join(temp, 'meta', '_journal.json'), JSON.stringify(journal));
  for (const entry of journal.entries)
    await copyFile(join(source, `${entry.tag}.sql`), join(temp, `${entry.tag}.sql`));
  await migrate(drizzle({ client }), { migrationsFolder: temp });
  await client.query(
    "INSERT INTO \"user\" (id,name,email) VALUES ('owner','Owner','legacy-refinement@example.test')",
  );
  const habit = (
    await client.query(
      "INSERT INTO habits (user_id,name,schedule,start_date,archived) VALUES ('owner','Legacy','weekdays','2025-01-01',true) RETURNING id",
    )
  ).rows[0];
  await client.query(
    "INSERT INTO habit_entries (user_id,habit_id,date) VALUES ('owner',$1,'2025-01-02')",
    [habit.id],
  );
  await migrate(drizzle({ client }), { migrationsFolder: source });
  const [revision] = (
    await client.query(
      'SELECT effective_date,schedule,status,source FROM habit_schedule_revisions WHERE habit_id=$1',
      [habit.id],
    )
  ).rows;
  assert.equal(revision.schedule, 'weekdays');
  assert.equal(revision.status, 'archived');
  assert.equal(revision.source, 'legacy');
  assert(new Date(revision.effective_date).getTime() > new Date('2025-01-02').getTime());
  assert.equal(
    (
      await client.query('SELECT count(*)::int AS count FROM habit_entries WHERE habit_id=$1', [
        habit.id,
      ])
    ).rows[0].count,
    1,
  );
  assert.equal(
    (await client.query('SELECT archived FROM habits WHERE id=$1', [habit.id])).rows[0].archived,
    true,
  );
  console.log(
    'Refinement PGlite 0013-to-0014 upgrade preserves legacy habit and entries without inferred old rules: PASS',
  );
} finally {
  await client.close();
  const root = await realpath(tmpdir());
  const target = await realpath(temp);
  assert(target.startsWith(root + '\\') || target.startsWith(root + '/'));
  await rm(temp, { recursive: true, force: true });
}
