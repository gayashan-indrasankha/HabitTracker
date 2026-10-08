import { and, asc, desc, eq, gte, lte, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  dayPlans,
  goals,
  metricEntries,
  projects,
  subjectAssessments,
  subjects,
  tasks,
  timeBlockExceptions,
  timeBlocks,
  weeklyReviews,
} from '@/lib/db/schema';

export const getGoals = (userId: string) =>
  db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(asc(goals.priority), asc(goals.createdAt));
export const getProjects = (userId: string) =>
  db.select().from(projects).where(eq(projects.userId, userId)).orderBy(asc(projects.createdAt));
export const getTasks = (userId: string) =>
  db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.status), asc(tasks.sortOrder), asc(tasks.createdAt));
export const getSubjects = (userId: string) =>
  db.select().from(subjects).where(eq(subjects.userId, userId)).orderBy(asc(subjects.slot));
export const getAssessments = (userId: string) =>
  db
    .select()
    .from(subjectAssessments)
    .where(eq(subjectAssessments.userId, userId))
    .orderBy(asc(subjectAssessments.dueDate));
export const getMetrics = (userId: string, type?: string) =>
  db
    .select()
    .from(metricEntries)
    .where(
      type
        ? and(eq(metricEntries.userId, userId), eq(metricEntries.type, type))
        : eq(metricEntries.userId, userId),
    )
    .orderBy(desc(metricEntries.date), desc(metricEntries.createdAt));
export const getReview = async (userId: string, weekStart: string) =>
  (
    await db
      .select()
      .from(weeklyReviews)
      .where(and(eq(weeklyReviews.userId, userId), eq(weeklyReviews.weekStart, weekStart)))
      .limit(1)
  )[0] ?? null;
export const getDayPlan = async (userId: string, date: string) =>
  (
    await db
      .select()
      .from(dayPlans)
      .where(and(eq(dayPlans.userId, userId), eq(dayPlans.date, date)))
      .limit(1)
  )[0] ?? null;

export async function getBlocksForRange(userId: string, start: string, end: string) {
  const [rules, exceptions] = await Promise.all([
    db.select().from(timeBlocks).where(eq(timeBlocks.userId, userId)),
    db
      .select()
      .from(timeBlockExceptions)
      .where(
        and(
          eq(timeBlockExceptions.userId, userId),
          or(
            and(
              gte(timeBlockExceptions.occurrenceDate, start),
              lte(timeBlockExceptions.occurrenceDate, end),
            ),
            and(
              gte(timeBlockExceptions.overrideDate, start),
              lte(timeBlockExceptions.overrideDate, end),
            ),
          ),
        ),
      ),
  ]);
  return { rules, exceptions };
}
