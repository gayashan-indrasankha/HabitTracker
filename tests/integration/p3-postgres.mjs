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
const name = `habitflow_p3_test_${randomUUID().replaceAll('-', '')}`;
let created = false;
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  created = true;
  const sql = postgres({ ...connection, database: name, max: 3 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: 'lib/db/migrations' });
    await sql`INSERT INTO "user" (id,name,email) VALUES ('owner','Owner','owner-p3@example.test'),('other','Other','other-p3@example.test')`;
    const [subject] =
      await sql`INSERT INTO subjects (user_id,slot,name) VALUES ('owner',1,'Algorithms') RETURNING id`;
    const [topic] =
      await sql`INSERT INTO subject_topics (user_id,subject_id,title) VALUES ('owner',${subject.id},'Graphs') RETURNING id`;
    await assert.rejects(
      sql`INSERT INTO subject_topics (user_id,subject_id,title) VALUES ('other',${subject.id},'Stolen')`,
    );
    await sql`INSERT INTO topic_practices (user_id,topic_id,date,type,correct,total) VALUES ('owner',${topic.id},'2026-10-08','quiz',8,10)`;
    await assert.rejects(
      sql`INSERT INTO topic_practices (user_id,topic_id,date,type) VALUES ('other',${topic.id},'2026-10-08','quiz')`,
    );
    const [project] =
      await sql`INSERT INTO projects (user_id,name) VALUES ('owner','Portfolio') RETURNING id`;
    const [task] =
      await sql`INSERT INTO tasks (user_id,project_id,title,is_milestone) VALUES ('owner',${project.id},'Auth',true) RETURNING id`;
    await sql`INSERT INTO milestone_criteria (user_id,task_id,title,met) VALUES ('owner',${task.id},'Tests pass',true)`;
    await assert.rejects(
      sql`INSERT INTO milestone_reviews (user_id,task_id,state) VALUES ('other',${task.id},'meets_criteria')`,
    );
    await sql`INSERT INTO milestone_reviews (user_id,task_id,state,reviewed_on) VALUES ('owner',${task.id},'meets_criteria','2026-10-08')`;
    await assert.rejects(
      sql`INSERT INTO milestone_review_history (user_id,task_id,state,reviewer,criteria_snapshot) VALUES ('other',${task.id},'needs_improvements','Self','[]')`,
    );
    await sql`INSERT INTO milestone_review_history (user_id,task_id,state,reviewer,criteria_snapshot) VALUES ('owner',${task.id},'needs_improvements','Self','[{"title":"Tests pass","met":false}]')`;
    await sql`INSERT INTO milestone_review_history (user_id,task_id,state,reviewer,criteria_snapshot) VALUES ('owner',${task.id},'meets_criteria','Self','[{"title":"Tests pass","met":true}]')`;
    const reviewSnapshots = await sql`SELECT state,criteria_snapshot FROM milestone_review_history WHERE task_id=${task.id} ORDER BY created_at,id`;
    assert.equal(reviewSnapshots.length, 2);
    assert(reviewSnapshots.some((row) => row.criteria_snapshot.includes('"met":false')));
    assert(reviewSnapshots.some((row) => row.criteria_snapshot.includes('"met":true')));
    const [topicInterview] =
      await sql`INSERT INTO interview_topics (user_id,category,title,role_track) VALUES ('owner','SQL','JOINs','Shared') RETURNING id`;
    const [scoredInterview] = await sql`INSERT INTO interview_practices (user_id,topic_id,date,role_track,type,correct,total) VALUES ('owner',${topicInterview.id},'2026-10-08','SE','technical_question',2,5) RETURNING correct,total`;
    assert.equal(scoredInterview.correct, 2);
    assert.equal(scoredInterview.total, 5);
    await assert.rejects(
      sql`INSERT INTO interview_practices (user_id,topic_id,date,role_track,type) VALUES ('other',${topicInterview.id},'2026-10-08','SE','mock')`,
    );
    const [english] =
      await sql`INSERT INTO english_practices (user_id,date,type,topic,duration_minutes) VALUES ('owner','2026-10-08','free_speaking','Project demo',10) RETURNING id`;
    await assert.rejects(
      sql`INSERT INTO grammar_mistakes (user_id,practice_id,original,corrected,category) VALUES ('other',${english.id},'I goes','I go','Agreement')`,
    );
    const [application] =
      await sql`INSERT INTO internship_applications (user_id,company,role_title,role_track) VALUES ('owner','Example','SE Intern','SE') RETURNING id`;
    await assert.rejects(
      sql`INSERT INTO application_stage_history (user_id,application_id,to_stage) VALUES ('other',${application.id},'applied')`,
    );
    await sql.begin(async (tx) => {
      const [current] =
        await tx`SELECT stage FROM internship_applications WHERE id=${application.id} FOR UPDATE`;
      await tx`UPDATE internship_applications SET stage='applied',applied_on='2026-10-08' WHERE id=${application.id}`;
      await tx`INSERT INTO application_stage_history (user_id,application_id,from_stage,to_stage) VALUES ('owner',${application.id},${current.stage},'applied')`;
    });
    const rows =
      await sql`SELECT from_stage,to_stage FROM application_stage_history WHERE application_id=${application.id}`;
    assert.deepEqual(
      rows.map((row) => [row.from_stage, row.to_stage]),
      [['saved', 'applied']],
    );
    await sql`UPDATE tasks SET status='done' WHERE id=${task.id}`;
    const [preserved] =
      await sql`SELECT t.id, m.state FROM tasks t JOIN milestone_reviews m ON m.task_id=t.id WHERE t.id=${task.id}`;
    assert.equal(preserved.id, task.id);
    assert.equal(preserved.state, 'meets_criteria');
    console.log(
      'P3 PostgreSQL fresh migration, owner FKs, stage transaction, and historical links: PASS',
    );
  } finally {
    await sql.end();
  }
} finally {
  if (created) await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
}
