import { eq, and, gte, lte, desc } from 'drizzle-orm';
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
export async function getNotesByUserAndMonth(
  userId: string,
  year: number,
  month: number,
) {
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

/**
 * Get all notes for a user (paginated for the notes page).
 */
export async function getAllNotesByUser(userId: string) {
  return db
    .select()
    .from(dailyNotes)
    .where(eq(dailyNotes.userId, userId))
    .orderBy(desc(dailyNotes.date));
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

/**
 * Delete a note.
 */
export async function deleteNote(userId: string, date: string) {
  await db
    .delete(dailyNotes)
    .where(and(eq(dailyNotes.userId, userId), eq(dailyNotes.date, date)));
}
