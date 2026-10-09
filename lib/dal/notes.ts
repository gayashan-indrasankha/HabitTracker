import { eq, and, gte, lte, lt, desc, count, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { dailyNotes } from '@/lib/db/schema';

/**
 * Get a single note for a user on a specific date.
 */
export async function getNoteByUserAndDate(userId: string, date: string) {
  const result = await db
    .select()
    .from(dailyNotes)
    .where(and(eq(dailyNotes.userId, userId), eq(dailyNotes.date, date)))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Get all notes for a user in a given month.
 */
export async function getNotesByUserAndMonth(userId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return db
    .select()
    .from(dailyNotes)
    .where(
      and(
        eq(dailyNotes.userId, userId),
        gte(dailyNotes.date, startDate),
        lte(dailyNotes.date, endDate),
      ),
    )
    .orderBy(desc(dailyNotes.date));
}

/** Years with past journal entries, newest first. Today's entry is shown separately. */
export async function getJournalYears(userId: string, today: string) {
  const year = sql<number>`extract(year from ${dailyNotes.date})::int`;
  return db
    .select({ year, entries: count() })
    .from(dailyNotes)
    .where(and(eq(dailyNotes.userId, userId), lt(dailyNotes.date, today)))
    .groupBy(year)
    .orderBy(desc(year));
}

/** Load one page of past entries without reading the full journal history. */
export async function getJournalPage(
  userId: string,
  today: string,
  year: number | null,
  requestedPage: number,
  pageSize = 12,
) {
  const filter = and(
    eq(dailyNotes.userId, userId),
    lt(dailyNotes.date, today),
    ...(year === null
      ? []
      : [gte(dailyNotes.date, `${year}-01-01`), lt(dailyNotes.date, `${year + 1}-01-01`)]),
  );
  const [{ total }] = await db.select({ total: count() }).from(dailyNotes).where(filter);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), pages);
  const entries = await db
    .select()
    .from(dailyNotes)
    .where(filter)
    .orderBy(desc(dailyNotes.date))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { entries, total, page, pages };
}

/**
 * Upsert a daily note.
 */
export async function upsertNote(userId: string, date: string, content: string) {
  const result = await db
    .insert(dailyNotes)
    .values({ userId, date, content })
    .onConflictDoUpdate({
      target: [dailyNotes.userId, dailyNotes.date],
      set: { content, updatedAt: new Date() },
    })
    .returning();
  return result[0];
}
