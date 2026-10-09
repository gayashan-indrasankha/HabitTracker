// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/lib/db/schema';
import { sectionLabels } from '@/lib/life-os/preset';

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('@/lib/db', () => ({
  get db() {
    return state.db;
  },
}));
import {
  installPersonalLifeOs,
  previewPersonalLifeOs,
  type SetupOptions,
} from '@/lib/life-os/install';

const options: SetupOptions = {
  sections: Object.keys(sectionLabels) as SetupOptions['sections'],
  mondayStart: '08:00',
  mondayEnd: '18:30',
  tuesdayStart: '08:00',
  tuesdayEnd: '15:00',
  calories: 3207,
  protein: 157,
  updateSchedule: false,
  confirm: true,
};
let client: PGlite;
const count = async (table: string, user = 'owner') =>
  (
    await client.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM ${table} WHERE user_id=$1`,
      [user],
    )
  ).rows[0].count;

describe('Personal Life OS isolated PGlite installation', () => {
  beforeAll(async () => {
    process.env.HABITFLOW_TEST_NOW = '2026-10-09T06:00:00Z';
    client = new PGlite();
    state.db = drizzle({ client, schema });
    await migrate(state.db as ReturnType<typeof drizzle>, {
      migrationsFolder: 'lib/db/migrations',
    });
    await client.query(
      `INSERT INTO "user" (id,name,email) VALUES ('owner','Owner','life-os-owner@example.test'),('other','Other','life-os-other@example.test')`,
    );
  }, 120_000);
  afterAll(async () => {
    await client?.close();
    delete process.env.HABITFLOW_TEST_NOW;
  });

  it('previews without writes, installs linked data, and repeats without duplicates', async () => {
    const preview = await previewPersonalLifeOs('owner', options);
    expect(preview.items.filter((item) => item.status === 'new')).toHaveLength(114);
    expect(await count('goals')).toBe(0);
    const result = await installPersonalLifeOs('owner', options);
    expect(result.conflicts).toBe(0);
    expect(result.created).toBe(114);
    expect(await count('goals')).toBe(9);
    expect(await count('projects')).toBe(3);
    expect(await count('tasks')).toBe(40);
    expect(await count('subjects')).toBe(5);
    expect(await count('habits')).toBe(8);
    expect(await count('time_blocks')).toBe(22);
    expect(await count('interview_topics')).toBe(21);
    expect(await count('meal_templates')).toBe(6);
    expect(await count('goals', 'other')).toBe(0);
    expect(await count('metric_entries')).toBe(0);
    expect(await count('habit_entries')).toBe(0);
    expect(await count('meal_logs')).toBe(0);
    expect(await count('internship_applications')).toBe(0);
    expect(await count('weekly_reviews')).toBe(0);
    const links = await client.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM projects WHERE user_id=$1 AND goal_id IS NOT NULL',
      ['owner'],
    );
    expect(links.rows[0].count).toBe(3);
    const repeat = await installPersonalLifeOs('owner', options);
    expect(repeat.created).toBe(0);
  }, 120_000);

  it('preserves changed and deleted seeded records, filling only missing items', async () => {
    await client.query(
      `UPDATE goals SET title='My customized university goal' WHERE user_id='owner' AND template_key='university'`,
    );
    await client.query(
      `DELETE FROM meal_templates WHERE user_id='owner' AND template_key='meal-6'`,
    );
    await client.query(
      `DELETE FROM tasks WHERE user_id='owner' AND template_key='english-prompt-10'`,
    );
    const preview = await previewPersonalLifeOs('owner', options);
    expect(preview.items.find((item) => item.key === 'meal-6')?.status).toBe('deleted');
    expect(preview.items.find((item) => item.key === 'english-prompt-10')?.status).toBe('deleted');
    expect(preview.items.find((item) => item.key === 'university')?.status).toBe('existing');
    const repeat = await installPersonalLifeOs('owner', options);
    expect(repeat.created).toBe(0);
    expect(await count('meal_templates')).toBe(5);
    expect(await count('tasks')).toBe(39);
    const title = await client.query<{ title: string }>(
      `SELECT title FROM goals WHERE user_id='owner' AND template_key='university'`,
    );
    expect(title.rows[0].title).toBe('My customized university goal');
    expect(await count('goals', 'other')).toBe(0);
  }, 120_000);

  it('fills a missing managed item while leaving an archived item archived', async () => {
    await client.query(
      `DELETE FROM life_os_seed_items WHERE user_id='owner' AND item_type='Meal template' AND template_key='meal-6'`,
    );
    await client.query(
      `UPDATE goals SET status='archived', archived_at=now() WHERE user_id='owner' AND template_key='interviews'`,
    );
    const preview = await previewPersonalLifeOs('owner', options);
    expect(preview.items.find((item) => item.key === 'meal-6')?.status).toBe('new');
    expect(preview.items.find((item) => item.key === 'interviews')?.status).toBe('archived');
    const result = await installPersonalLifeOs('owner', options);
    expect(result.created).toBe(1);
    expect(await count('meal_templates')).toBe(6);
    const status = await client.query<{ status: string }>(
      `SELECT status FROM goals WHERE user_id='owner' AND template_key='interviews'`,
    );
    expect(status.rows[0].status).toBe('archived');
  }, 120_000);

  it('skips a fixed conflict and keeps accounts isolated', async () => {
    await client.query(
      `INSERT INTO time_blocks (user_id,title,category,local_start_time,local_end_time,weekday_mask,start_date,is_fixed) VALUES ('other','Existing fixed lecture','University','09:00','10:00','1000000','2026-10-01',true)`,
    );
    const university = { ...options, sections: ['university'] as SetupOptions['sections'] };
    const preview = await previewPersonalLifeOs('other', university);
    expect(preview.items.find((item) => item.key === 'lecture-mon')?.status).toBe('conflict');
    const result = await installPersonalLifeOs('other', university);
    expect(result.conflicts).toBeGreaterThan(0);
    const lecture = await client.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM time_blocks WHERE user_id='other' AND template_key='lecture-mon'`,
    );
    expect(lecture.rows[0].count).toBe(0);
    expect(await count('goals', 'owner')).toBe(9);
    expect(await count('goals', 'other')).toBe(1);
  }, 120_000);

  it('applies an explicit dated revision only to an untouched legacy series', async () => {
    const block = await client.query<{ id: string }>(
      `UPDATE time_blocks SET title='Academic consolidation', weekday_mask='0000010', local_start_time='09:00', local_end_time='11:00', start_date='2026-09-01' WHERE user_id='owner' AND template_key='academic-sat' RETURNING id`,
    );
    const id = block.rows[0].id;
    await client.query('DELETE FROM time_block_revisions WHERE block_id=$1', [id]);
    await client.query(
      `INSERT INTO time_block_exceptions (user_id,block_id,occurrence_date,status) VALUES ('owner',$1,'2026-10-03','completed')`,
      [id],
    );
    const updateOptions = {
      ...options,
      updateSchedule: true,
      sections: ['university'] as SetupOptions['sections'],
    };
    const preview = await previewPersonalLifeOs('owner', updateOptions);
    expect(preview.items.find((item) => item.key === 'academic-sat')?.status).toBe('update');
    const result = await installPersonalLifeOs('owner', updateOptions);
    expect(result.updated).toBe(1);
    const revision = await client.query<{ local_start_time: string; effective_date: string }>(
      'SELECT local_start_time,effective_date FROM time_block_revisions WHERE block_id=$1',
      [id],
    );
    expect(revision.rows[0].local_start_time).toBe('08:30');
    expect(new Date(revision.rows[0].effective_date).toISOString().slice(0, 10)).toBe('2026-10-09');
    const history = await client.query<{ status: string }>(
      'SELECT status FROM time_block_exceptions WHERE block_id=$1 AND occurrence_date=$2',
      [id, '2026-10-03'],
    );
    expect(history.rows[0].status).toBe('completed');
    const repeat = await installPersonalLifeOs('owner', updateOptions);
    expect(repeat.updated).toBe(0);
  }, 120_000);

  it('rolls back every inserted record if a mandatory insert fails', async () => {
    await client.query(
      `INSERT INTO "user" (id,name,email) VALUES ('rollback','Rollback','life-os-rollback@example.test')`,
    );
    await client.query(
      `CREATE FUNCTION reject_life_os_goal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id = 'rollback' AND NEW.template_key = 'industry' THEN RAISE EXCEPTION 'fixture rollback'; END IF; RETURN NEW; END $$`,
    );
    await client.query(
      `CREATE TRIGGER reject_life_os_goal BEFORE INSERT ON goals FOR EACH ROW EXECUTE FUNCTION reject_life_os_goal()`,
    );
    await expect(installPersonalLifeOs('rollback', options)).rejects.toThrow();
    expect(await count('goals', 'rollback')).toBe(0);
    expect(await count('user_settings', 'rollback')).toBe(0);
    expect(await count('life_os_seed_items', 'rollback')).toBe(0);
  }, 120_000);
});
