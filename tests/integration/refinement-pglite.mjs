import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const client = new PGlite();
try {
  await migrate(drizzle({ client }), { migrationsFolder: 'lib/db/migrations' });
  await client.query(
    "INSERT INTO \"user\" (id,name,email) VALUES ('owner','Owner','owner-refinement@example.test'),('other','Other','other-refinement@example.test')",
  );
  const habit = (
    await client.query(
      "INSERT INTO habits (user_id,name,schedule,start_date) VALUES ('owner','Gym','daily','2026-12-28') RETURNING id",
    )
  ).rows[0];
  await client.query(
    "INSERT INTO habit_schedule_revisions (user_id,habit_id,effective_date,schedule,start_date) VALUES ('owner',$1,'2026-12-28','daily','2026-12-28')",
    [habit.id],
  );
  await client.query(
    "INSERT INTO habit_entries (user_id,habit_id,date) VALUES ('owner',$1,'2026-12-31'),('owner',$1,'2027-01-01')",
    [habit.id],
  );
  await client.query(
    "INSERT INTO habit_schedule_revisions (user_id,habit_id,effective_date,schedule,start_date) VALUES ('owner',$1,'2027-01-04','weekly:3','2026-12-28')",
    [habit.id],
  );
  await client.query(
    "INSERT INTO habit_schedule_revisions (user_id,habit_id,effective_date,schedule,start_date,status) VALUES ('owner',$1,'2027-01-11','weekly:3','2026-12-28','archived')",
    [habit.id],
  );
  await client.query(
    "INSERT INTO habit_schedule_revisions (user_id,habit_id,effective_date,schedule,start_date) VALUES ('owner',$1,'2027-01-18','weekly:3','2026-12-28')",
    [habit.id],
  );
  await assert.rejects(
    client.query(
      "INSERT INTO habit_schedule_revisions (user_id,habit_id,effective_date,schedule,start_date) VALUES ('other',$1,'2027-01-25','daily','2026-12-28')",
      [habit.id],
    ),
  );
  const history = await client.query(
    'SELECT schedule,status FROM habit_schedule_revisions WHERE habit_id=$1 ORDER BY effective_date',
    [habit.id],
  );
  assert.deepEqual(
    history.rows.map((row) => [row.schedule, row.status]),
    [
      ['daily', 'active'],
      ['weekly:3', 'active'],
      ['weekly:3', 'archived'],
      ['weekly:3', 'active'],
    ],
  );
  assert.equal(
    (
      await client.query('SELECT count(*)::int AS count FROM habit_entries WHERE habit_id=$1', [
        habit.id,
      ])
    ).rows[0].count,
    2,
  );

  const meal = (
    await client.query(
      "INSERT INTO meal_templates (user_id,name,notes,planned_calories,active) VALUES ('owner','Breakfast','Existing plan',500,true) RETURNING id",
    )
  ).rows[0];
  await client.query(
    "INSERT INTO meal_logs (user_id,meal_id,date,status) VALUES ('owner',$1,'2027-01-01','followed')",
    [meal.id],
  );
  await client.query(
    "UPDATE meal_logs SET status='not_followed' WHERE meal_id=$1 AND date='2027-01-01'",
    [meal.id],
  );
  await client.query(
    "UPDATE meal_logs SET actual_calories=300, actual_protein=30, actual_carbs=40, actual_fat=10 WHERE meal_id=$1 AND date='2027-01-01'",
    [meal.id],
  );
  await assert.rejects(
    client.query(
      "INSERT INTO meal_logs (user_id,meal_id,date,status) VALUES ('other',$1,'2027-01-02','followed')",
      [meal.id],
    ),
  );
  await client.query('UPDATE meal_templates SET active=false WHERE id=$1', [meal.id]);
  await client.query('UPDATE meal_templates SET planned_carbs=60, planned_fat=20 WHERE id=$1', [
    meal.id,
  ]);
  await client.query(
    "INSERT INTO user_settings (user_id,nutrition_enabled) VALUES ('owner',false)",
  );
  assert.equal(
    (await client.query('SELECT status FROM meal_logs WHERE meal_id=$1', [meal.id])).rows[0].status,
    'not_followed',
  );
  assert.equal(
    (await client.query('SELECT planned_calories FROM meal_templates WHERE id=$1', [meal.id]))
      .rows[0].planned_calories,
    500,
  );
  const plannedMacros = (
    await client.query('SELECT planned_carbs, planned_fat FROM meal_templates WHERE id=$1', [
      meal.id,
    ])
  ).rows[0];
  assert.equal(plannedMacros.planned_carbs, 60);
  assert.equal(plannedMacros.planned_fat, 20);
  await client.query("UPDATE meal_logs SET status=NULL WHERE meal_id=$1 AND date='2027-01-01'", [
    meal.id,
  ]);
  const actuals = (
    await client.query(
      'SELECT status, actual_calories, actual_protein, actual_carbs, actual_fat FROM meal_logs WHERE meal_id=$1',
      [meal.id],
    )
  ).rows[0];
  assert.deepEqual(
    [
      actuals.status,
      actuals.actual_calories,
      actuals.actual_protein,
      actuals.actual_carbs,
      actuals.actual_fat,
    ],
    [null, 300, 30, 40, 10],
  );
  const columns = (
    await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='meal_logs'",
    )
  ).rows.map((row) => row.column_name);
  assert(columns.includes('actual_calories'));
  await client.query("DELETE FROM meal_logs WHERE meal_id=$1 AND date='2027-01-01'", [meal.id]);
  assert.equal(
    (await client.query('SELECT count(*)::int AS count FROM meal_logs WHERE meal_id=$1', [meal.id]))
      .rows[0].count,
    0,
  );
  console.log(
    'Refinement PGlite fresh migration, dated habit history, meal ownership and status persistence: PASS',
  );
} finally {
  await client.close();
}
