import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const client = new PGlite();
try {
  await migrate(drizzle({ client }), { migrationsFolder: 'lib/db/migrations' });
  await client.query(
    "INSERT INTO \"user\" (id,name,email) VALUES ('owner','Owner','owner-p3-pglite@example.test'),('other','Other','other-p3-pglite@example.test')",
  );
  const subject = await client.query(
    "INSERT INTO subjects (user_id,slot,name) VALUES ('owner',1,'Algorithms') RETURNING id",
  );
  await assert.rejects(
    client.query(
      "INSERT INTO subject_topics (user_id,subject_id,title) VALUES ('other',$1,'Stolen')",
      [subject.rows[0].id],
    ),
  );
  const topic = await client.query(
    "INSERT INTO subject_topics (user_id,subject_id,title) VALUES ('owner',$1,'Graphs') RETURNING id",
    [subject.rows[0].id],
  );
  await client.query(
    "INSERT INTO topic_practices (user_id,topic_id,date,type,correct,total) VALUES ('owner',$1,'2026-10-08','quiz',8,10)",
    [topic.rows[0].id],
  );
  const interviewTopic = await client.query(
    "INSERT INTO interview_topics (user_id,category,title,role_track) VALUES ('owner','SQL','JOINs','Shared') RETURNING id",
  );
  const scoredInterview = await client.query(
    "INSERT INTO interview_practices (user_id,topic_id,date,role_track,type,correct,total) VALUES ('owner',$1,'2026-10-08','SE','technical_question',2,5) RETURNING correct,total",
    [interviewTopic.rows[0].id],
  );
  assert.equal(scoredInterview.rows[0].correct, 2);
  assert.equal(scoredInterview.rows[0].total, 5);
  const application = await client.query(
    "INSERT INTO internship_applications (user_id,company,role_title,role_track) VALUES ('owner','Example','SE Intern','SE') RETURNING id",
  );
  await assert.rejects(
    client.query(
      "INSERT INTO application_stage_history (user_id,application_id,to_stage) VALUES ('other',$1,'applied')",
      [application.rows[0].id],
    ),
  );
  await client.query(
    "INSERT INTO application_stage_history (user_id,application_id,to_stage) VALUES ('owner',$1,'saved')",
    [application.rows[0].id],
  );
  const history = await client.query(
    'SELECT to_stage FROM application_stage_history WHERE application_id=$1',
    [application.rows[0].id],
  );
  assert.equal(history.rows[0].to_stage, 'saved');
  console.log('P3 PGlite fresh migration, owner FKs, and evidence persistence: PASS');
} finally {
  await client.close();
}
