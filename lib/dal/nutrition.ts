import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mealLogs, mealTemplates } from '@/lib/db/schema';

export const getMealTemplates = (userId: string) =>
  db
    .select()
    .from(mealTemplates)
    .where(eq(mealTemplates.userId, userId))
    .orderBy(asc(mealTemplates.sortOrder), asc(mealTemplates.createdAt));

export const getMealLogs = (userId: string, start: string, end: string) =>
  db
    .select()
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), gte(mealLogs.date, start), lte(mealLogs.date, end)));
