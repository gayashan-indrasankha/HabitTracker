'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { mealLogs, mealTemplates, userSettings } from '@/lib/db/schema';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';

export type NutritionActionState = { error?: string; success?: string };
const optionalNumber = (max: number) =>
  z.union([z.literal(''), z.coerce.number().int().min(0).max(max)]);
const mealInput = z.object({
  id: z.union([z.uuid(), z.literal('')]),
  name: z.string().trim().min(1).max(100),
  notes: z.string().max(500),
  preferredTime: z.union([z.literal(''), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]),
  plannedCalories: optionalNumber(6000),
  plannedProtein: optionalNumber(400),
  active: z.boolean(),
});

function revalidateNutrition() {
  for (const path of ['/today', '/settings', '/review']) revalidatePath(path);
}

export async function saveMealTemplateAction(
  _: NutritionActionState,
  form: FormData,
): Promise<NutritionActionState> {
  const userId = (await requireUser()).id;
  const parsed = mealInput.safeParse({
    id: form.get('id') ?? '',
    name: form.get('name'),
    notes: form.get('notes') ?? '',
    preferredTime: form.get('preferredTime') ?? '',
    plannedCalories: form.get('plannedCalories') ?? '',
    plannedProtein: form.get('plannedProtein') ?? '',
    active: form.get('active') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check meal details.' };
  const input = parsed.data;
  const values = {
    name: input.name,
    notes: input.notes || null,
    preferredTime: input.preferredTime || null,
    plannedCalories: input.plannedCalories === '' ? null : input.plannedCalories,
    plannedProtein: input.plannedProtein === '' ? null : input.plannedProtein,
    active: input.active,
    updatedAt: new Date(),
  };
  if (input.id) {
    const [updated] = await db
      .update(mealTemplates)
      .set(values)
      .where(and(eq(mealTemplates.id, input.id), eq(mealTemplates.userId, userId)))
      .returning({ id: mealTemplates.id });
    if (!updated) return { error: 'Meal not found.' };
  } else {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mealTemplates)
      .where(eq(mealTemplates.userId, userId));
    if (count >= 6) return { error: 'Keep the checklist to six meals or fewer.' };
    await db.insert(mealTemplates).values({ userId, ...values, sortOrder: count });
  }
  revalidateNutrition();
  return { success: 'Meal plan saved.' };
}

export async function setNutritionEnabledAction(
  _: NutritionActionState,
  form: FormData,
): Promise<NutritionActionState> {
  const userId = (await requireUser()).id;
  const enabled = form.get('enabled');
  if (enabled !== 'true' && enabled !== 'false') return { error: 'Choose a valid setting.' };
  const current = await getUserSettings(userId);
  await db
    .insert(userSettings)
    .values({
      userId,
      timezone: current.timezone,
      weekStartsOn: current.weekStartsOn,
      theme: current.theme,
      nutritionEnabled: enabled === 'true',
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { nutritionEnabled: enabled === 'true' },
    });
  revalidateNutrition();
  return {
    success:
      enabled === 'true'
        ? 'Nutrition checklist enabled.'
        : 'Nutrition checklist paused; history kept.',
  };
}

export async function setMealStatusAction(
  mealId: string,
  date: string,
  status: string,
): Promise<NutritionActionState> {
  const userId = (await requireUser()).id;
  if (
    !z.uuid().safeParse(mealId).success ||
    !z.iso.date().safeParse(date).success ||
    !['followed', 'not_followed', 'not_recorded'].includes(status)
  )
    return { error: 'Invalid meal entry.' };
  const [meal] = await db
    .select({ id: mealTemplates.id })
    .from(mealTemplates)
    .where(and(eq(mealTemplates.id, mealId), eq(mealTemplates.userId, userId)))
    .limit(1);
  if (!meal) return { error: 'Meal not found.' };
  const settings = await getUserSettings(userId);
  if (!settings.nutritionEnabled)
    return { error: 'Enable the nutrition checklist in Settings first.' };
  const today = toDateString(getTodayInTimezone(settings.timezone));
  if (date > today) return { error: 'Future meals cannot be recorded.' };
  if (status === 'not_recorded') {
    await db
      .delete(mealLogs)
      .where(
        and(eq(mealLogs.userId, userId), eq(mealLogs.mealId, mealId), eq(mealLogs.date, date)),
      );
  } else {
    await db
      .insert(mealLogs)
      .values({ userId, mealId, date, status })
      .onConflictDoUpdate({
        target: [mealLogs.mealId, mealLogs.date],
        set: { status, updatedAt: new Date() },
      });
  }
  revalidateNutrition();
  return { success: 'Meal status saved.' };
}
