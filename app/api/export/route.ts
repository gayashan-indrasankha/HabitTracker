import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  dayPlans,
  dailyNotes,
  goals,
  habitEntries,
  habits,
  metricEntries,
  projects,
  subjectAssessments,
  subjects,
  tasks,
  timeBlockExceptions,
  timeBlocks,
  userSettings,
  weeklyReviews,
} from '@/lib/db/schema';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const [
    habitRows,
    entryRows,
    noteRows,
    settingRows,
    goalRows,
    projectRows,
    taskRows,
    blockRows,
    exceptionRows,
    planRows,
    reviewRows,
    metricRows,
    subjectRows,
    assessmentRows,
  ] = await Promise.all([
    db.select().from(habits).where(eq(habits.userId, user.id)),
    db.select().from(habitEntries).where(eq(habitEntries.userId, user.id)),
    db.select().from(dailyNotes).where(eq(dailyNotes.userId, user.id)),
    db.select().from(userSettings).where(eq(userSettings.userId, user.id)),
    db.select().from(goals).where(eq(goals.userId, user.id)),
    db.select().from(projects).where(eq(projects.userId, user.id)),
    db.select().from(tasks).where(eq(tasks.userId, user.id)),
    db.select().from(timeBlocks).where(eq(timeBlocks.userId, user.id)),
    db.select().from(timeBlockExceptions).where(eq(timeBlockExceptions.userId, user.id)),
    db.select().from(dayPlans).where(eq(dayPlans.userId, user.id)),
    db.select().from(weeklyReviews).where(eq(weeklyReviews.userId, user.id)),
    db.select().from(metricEntries).where(eq(metricEntries.userId, user.id)),
    db.select().from(subjects).where(eq(subjects.userId, user.id)),
    db.select().from(subjectAssessments).where(eq(subjectAssessments.userId, user.id)),
  ]);
  const withoutOwner = <T extends { userId: string }>(rows: T[]) =>
    rows.map(({ userId: _userId, ...record }) => {
      void _userId;
      return record;
    });
  const data = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    habits: withoutOwner(habitRows),
    habitEntries: withoutOwner(entryRows),
    dailyNotes: withoutOwner(noteRows),
    userSettings: withoutOwner(settingRows),
    goals: withoutOwner(goalRows),
    projects: withoutOwner(projectRows),
    tasks: withoutOwner(taskRows),
    timeBlocks: withoutOwner(blockRows),
    timeBlockExceptions: withoutOwner(exceptionRows),
    dayPlans: withoutOwner(planRows),
    weeklyReviews: withoutOwner(reviewRows),
    metricEntries: withoutOwner(metricRows),
    subjects: withoutOwner(subjectRows),
    subjectAssessments: withoutOwner(assessmentRows),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="habitflow-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
