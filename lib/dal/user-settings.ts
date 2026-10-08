import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import type { UserSettingsInput } from '@/lib/validations/settings';

/**
 * Get settings for a user. Returns defaults if not set.
 */
export async function getUserSettings(userId: string) {
  const result = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return (
    result[0] ?? {
      userId,
      timezone: 'Asia/Colombo',
      weekStartsOn: 1,
      theme: 'system',
      flexibleCapacityMinutes: null,
    }
  );
}

/**
 * Upsert user settings.
 */
export async function upsertUserSettings(userId: string, input: UserSettingsInput) {
  const result = await db
    .insert(userSettings)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...input },
    })
    .returning();
  return result[0];
}
