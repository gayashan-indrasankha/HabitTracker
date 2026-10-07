import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { habits } from '@/lib/db/schema';
import type { HabitCreateInput, HabitUpdateInput } from '@/lib/validations/habit';

/**
 * Get all active (non-archived) habits for a user, ordered by sort_order.
 */
export async function getActiveHabitsByUser(userId: string) {
  return db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.archived, false)))
    .orderBy(asc(habits.sortOrder), asc(habits.createdAt));
}

/**
 * Get all habits (including archived) for a user.
 */
export async function getAllHabitsByUser(userId: string) {
  return db
    .select()
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(asc(habits.archived), asc(habits.sortOrder), asc(habits.createdAt));
}

/**
 * Get a single habit by ID, scoped to the user.
 */
export async function getHabitByIdAndUser(habitId: string, userId: string) {
  const result = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Create a new habit for a user.
 */
export async function createHabit(userId: string, input: HabitCreateInput) {
  const result = await db
    .insert(habits)
    .values({
      userId,
      name: input.name,
      description: input.description || null,
      icon: input.icon || null,
      category: input.category || null,
      monthlyTarget: input.monthlyTarget,
      schedule: input.schedule,
      startDate: input.startDate,
      endDate: input.endDate || null,
    })
    .returning();
  return result[0];
}

/**
 * Update an existing habit (scoped to user).
 */
export async function updateHabit(
  habitId: string,
  userId: string,
  input: HabitUpdateInput,
) {
  const result = await db
    .update(habits)
    .set({
      ...input,
      description: input.description || null,
      icon: input.icon || null,
      category: input.category || null,
      endDate: input.endDate || null,
      updatedAt: new Date(),
    })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .returning();
  return result[0] ?? null;
}

/**
 * Archive (soft-delete) a habit.
 */
export async function archiveHabit(habitId: string, userId: string) {
  const result = await db
    .update(habits)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .returning();
  return result[0] ?? null;
}

/**
 * Unarchive a habit.
 */
export async function unarchiveHabit(habitId: string, userId: string) {
  const result = await db
    .update(habits)
    .set({ archived: false, updatedAt: new Date() })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .returning();
  return result[0] ?? null;
}

/**
 * Reorder habits by updating sort_order.
 */
export async function reorderHabits(userId: string, orderedIds: string[]) {
  const updates = orderedIds.map((id, index) =>
    db
      .update(habits)
      .set({ sortOrder: index, updatedAt: new Date() })
      .where(and(eq(habits.id, id), eq(habits.userId, userId))),
  );
  await Promise.all(updates);
}
