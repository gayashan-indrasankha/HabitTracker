import {
  boolean,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Better Auth managed tables
// ---------------------------------------------------------------------------
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [index('session_user_id_idx').on(table.userId)]);

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('account_user_provider_idx').on(table.userId, table.providerId)]);

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [index('verification_identifier_idx').on(table.identifier)]);

// ---------------------------------------------------------------------------
// Application tables
// ---------------------------------------------------------------------------
export const habits = pgTable(
  'habits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 50 }),
    category: varchar('category', { length: 60 }),
    monthlyTarget: smallint('monthly_target').notNull().default(20),
    schedule: text('schedule').notNull().default('daily'),
    templateKey: varchar('template_key', { length: 100 }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    archived: boolean('archived').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('habits_user_id_idx').on(table.userId), index('habits_user_archived_sort_idx').on(table.userId, table.archived, table.sortOrder), uniqueIndex('habits_user_template_idx').on(table.userId, table.templateKey), unique('habits_user_id_id_unique').on(table.userId, table.id)],
);

export const habitEntries = pgTable(
  'habit_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    completed: boolean('completed').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('habit_entries_habit_date_unique').on(table.habitId, table.date),
    index('habit_entries_user_month_idx').on(table.userId, table.date),
    index('habit_entries_habit_date_idx').on(table.habitId, table.date),
    foreignKey({ columns: [table.userId, table.habitId], foreignColumns: [habits.userId, habits.id], name: 'habit_entries_owner_fk' }).onDelete('cascade'),
  ],
);

export const dailyNotes = pgTable(
  'daily_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('daily_notes_user_date_unique').on(table.userId, table.date),
    index('daily_notes_user_date_idx').on(table.userId, table.date),
  ],
);

export const userSettings = pgTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  timezone: varchar('timezone', { length: 60 }).notNull().default('UTC'),
  weekStartsOn: smallint('week_starts_on').notNull().default(1),
  theme: varchar('theme', { length: 20 }).notNull().default('system'),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many, one }) => ({
  habits: many(habits),
  habitEntries: many(habitEntries),
  dailyNotes: many(dailyNotes),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
  entries: many(habitEntries),
}));

export const habitEntriesRelations = relations(habitEntries, ({ one }) => ({
  habit: one(habits, { fields: [habitEntries.habitId], references: [habits.id] }),
  user: one(users, { fields: [habitEntries.userId], references: [users.id] }),
}));

export const dailyNotesRelations = relations(dailyNotes, ({ one }) => ({
  user: one(users, { fields: [dailyNotes.userId], references: [users.id] }),
}));

// Life OS records are additive. Existing habit, entry and note IDs remain stable.
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  area: varchar('area', { length: 80 }).notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  priority: smallint('priority').notNull().default(2),
  targetDate: date('target_date'),
  targetValue: doublePrecision('target_value'),
  targetUnit: varchar('target_unit', { length: 32 }),
  templateKey: varchar('template_key', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('goals_user_status_idx').on(t.userId, t.status), unique('goals_user_id_id_unique').on(t.userId, t.id), uniqueIndex('goals_user_template_idx').on(t.userId, t.templateKey)]);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  goalId: uuid('goal_id'),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 60 }).notNull().default('General'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  deadline: date('deadline'),
  repositoryUrl: text('repository_url'),
  templateKey: varchar('template_key', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('projects_user_status_idx').on(t.userId, t.status), unique('projects_user_id_id_unique').on(t.userId, t.id), uniqueIndex('projects_user_template_idx').on(t.userId, t.templateKey), foreignKey({ columns: [t.userId, t.goalId], foreignColumns: [goals.userId, goals.id], name: 'projects_goal_owner_fk' })]);

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  goalId: uuid('goal_id'),
  projectId: uuid('project_id'),
  title: varchar('title', { length: 160 }).notNull(),
  details: text('details'),
  area: varchar('area', { length: 80 }).notNull().default('Personal Development'),
  status: varchar('status', { length: 20 }).notNull().default('todo'),
  priority: smallint('priority').notNull().default(2),
  estimatedMinutes: integer('estimated_minutes'),
  actualMinutes: integer('actual_minutes'),
  dueDate: date('due_date'),
  scheduledDate: date('scheduled_date'),
  dailyPriority: smallint('daily_priority'),
  sortOrder: integer('sort_order').notNull().default(0),
  isMilestone: boolean('is_milestone').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('tasks_user_schedule_idx').on(t.userId, t.scheduledDate), index('tasks_user_project_idx').on(t.userId, t.projectId), uniqueIndex('tasks_user_date_priority_unique').on(t.userId, t.scheduledDate, t.dailyPriority), unique('tasks_user_id_id_unique').on(t.userId, t.id), foreignKey({ columns: [t.userId, t.goalId], foreignColumns: [goals.userId, goals.id], name: 'tasks_goal_owner_fk' }), foreignKey({ columns: [t.userId, t.projectId], foreignColumns: [projects.userId, projects.id], name: 'tasks_project_owner_fk' })]);

export const timeBlocks = pgTable('time_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 160 }).notNull(),
  category: varchar('category', { length: 80 }).notNull(),
  localStartTime: varchar('local_start_time', { length: 5 }).notNull(),
  localEndTime: varchar('local_end_time', { length: 5 }).notNull(),
  weekdayMask: varchar('weekday_mask', { length: 7 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  isFixed: boolean('is_fixed').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  goalId: uuid('goal_id'),
  projectId: uuid('project_id'),
  taskId: uuid('task_id'),
  templateKey: varchar('template_key', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('time_blocks_user_dates_idx').on(t.userId, t.startDate, t.endDate), unique('time_blocks_user_id_id_unique').on(t.userId, t.id), uniqueIndex('time_blocks_user_template_idx').on(t.userId, t.templateKey), foreignKey({ columns: [t.userId, t.goalId], foreignColumns: [goals.userId, goals.id], name: 'time_blocks_goal_owner_fk' }), foreignKey({ columns: [t.userId, t.projectId], foreignColumns: [projects.userId, projects.id], name: 'time_blocks_project_owner_fk' }), foreignKey({ columns: [t.userId, t.taskId], foreignColumns: [tasks.userId, tasks.id], name: 'time_blocks_task_owner_fk' })]);

export const timeBlockExceptions = pgTable('time_block_exceptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockId: uuid('block_id').notNull(),
  occurrenceDate: date('occurrence_date').notNull(),
  overrideDate: date('override_date'),
  overrideStartTime: varchar('override_start_time', { length: 5 }),
  overrideEndTime: varchar('override_end_time', { length: 5 }),
  status: varchar('status', { length: 20 }).notNull(),
  reason: text('reason'),
  actualMinutes: integer('actual_minutes'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique('time_block_exceptions_block_date_unique').on(t.blockId, t.occurrenceDate), index('time_block_exceptions_user_date_idx').on(t.userId, t.occurrenceDate), foreignKey({ columns: [t.userId, t.blockId], foreignColumns: [timeBlocks.userId, timeBlocks.id], name: 'time_block_exceptions_owner_fk' }).onDelete('cascade')]);

export const dayPlans = pgTable('day_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  mode: varchar('mode', { length: 12 }).notNull().default('normal'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique('day_plans_user_date_unique').on(t.userId, t.date)]);

export const weeklyReviews = pgTable('weekly_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weekStart: date('week_start').notNull(),
  answers: text('answers').notNull().default('{}'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique('weekly_reviews_user_week_unique').on(t.userId, t.weekStart)]);

export const metricEntries = pgTable('metric_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  type: varchar('type', { length: 60 }).notNull(),
  value: doublePrecision('value').notNull(),
  unit: varchar('unit', { length: 24 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('metric_entries_user_type_date_idx').on(t.userId, t.type, t.date)]);

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slot: smallint('slot').notNull(),
  name: varchar('name', { length: 120 }),
  targetGrade: varchar('target_grade', { length: 20 }),
  actualGrade: varchar('actual_grade', { length: 20 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique('subjects_user_slot_unique').on(t.userId, t.slot), unique('subjects_user_id_id_unique').on(t.userId, t.id)]);

export const subjectAssessments = pgTable('subject_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  dueDate: date('due_date'),
  status: varchar('status', { length: 20 }).notNull().default('todo'),
  actualGrade: varchar('actual_grade', { length: 20 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('subject_assessments_user_due_idx').on(t.userId, t.dueDate), foreignKey({ columns: [t.userId, t.subjectId], foreignColumns: [subjects.userId, subjects.id], name: 'subject_assessments_owner_fk' }).onDelete('cascade')]);
