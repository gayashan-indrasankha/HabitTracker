'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  dayPlans,
  habits,
  timeBlockExceptions,
  timeBlockRevisions,
  timeBlocks,
  timeOffDays,
  userSettings,
} from '@/lib/db/schema';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTodayInTimezone, serverNow, toDateString } from '@/lib/utils/date';
import {
  expandBlocks,
  futureBoundaryDates,
  overlaps,
  ruleOn,
  sameOccurrence,
  weekdayIndex,
} from '@/lib/planning/time-blocks';
import { scheduledInstant } from '@/lib/planning/occurrence-time';
import type { LifeActionState } from './life-actions';

export type PlanningState = LifeActionState & { affected?: { key: string; title: string }[] };

const fail = (error: string): LifeActionState => ({ error });
const refresh = () => {
  for (const route of ['/today', '/week', '/review', '/settings']) revalidatePath(route);
};
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const timeOffInput = z.object({
  id: z.union([z.uuid(), z.literal('')]),
  date: z.iso.date(),
  type: z.enum(['Travel', 'Social', 'Recovery', 'Personal']),
  title: z.string().trim().max(160),
  note: z.string().trim().max(1000),
  allDay: z.boolean(),
  start: z.union([time, z.literal('')]),
  end: z.union([time, z.literal('')]),
  selected: z.array(z.string()).max(30),
  confirm: z.boolean(),
});

export async function saveCapacityAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .union([z.literal(''), z.coerce.number().int().min(15).max(1440)])
    .safeParse(form.get('capacity'));
  if (!parsed.success) return fail('Choose 15–1440 minutes, or clear the capacity.');
  await db
    .insert(userSettings)
    .values({ userId, flexibleCapacityMinutes: parsed.data === '' ? null : parsed.data })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { flexibleCapacityMinutes: parsed.data === '' ? null : parsed.data },
    });
  refresh();
  return { success: 'Daily flexible capacity saved.' };
}

export async function saveMinimumAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      date: z.iso.date(),
      habitId: z.union([z.uuid(), z.literal('')]),
      action: z.string().trim().max(160),
      done: z.enum(['yes', 'no']).optional(),
    })
    .safeParse({
      date: form.get('date'),
      habitId: form.get('habitId') || '',
      action: form.get('action') || '',
      done: form.get('done') || undefined,
    });
  if (!parsed.success) return fail('Check the smaller action.');
  const settings = await getUserSettings(userId);
  if (parsed.data.date !== toDateString(getTodayInTimezone(settings.timezone)))
    return fail('Minimum actions can only be changed for today.');
  if (
    parsed.data.habitId &&
    !(
      await db
        .select({ id: habits.id })
        .from(habits)
        .where(and(eq(habits.userId, userId), eq(habits.id, parsed.data.habitId)))
        .limit(1)
    )[0]
  )
    return fail('Habit not found.');
  if (parsed.data.done === 'yes' && !parsed.data.action)
    return fail('Describe the small action first.');
  await db
    .insert(dayPlans)
    .values({
      userId,
      date: parsed.data.date,
      minimumHabitId: parsed.data.habitId || null,
      minimumAction: parsed.data.action || null,
      minimumActionDone: parsed.data.done === 'yes',
    })
    .onConflictDoUpdate({
      target: [dayPlans.userId, dayPlans.date],
      set: {
        minimumHabitId: parsed.data.habitId || null,
        minimumAction: parsed.data.action || null,
        minimumActionDone: parsed.data.done === 'yes',
        updatedAt: new Date(),
      },
    });
  refresh();
  return {
    success:
      parsed.data.done === 'yes'
        ? 'Small action recorded separately from full habit completion.'
        : 'Small action saved.',
  };
}

export async function logSessionMinutesAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      blockId: z.uuid(),
      occurrenceDate: z.iso.date(),
      minutes: z.coerce.number().int().min(0).max(1440),
    })
    .safeParse({
      blockId: form.get('blockId'),
      occurrenceDate: form.get('occurrenceDate'),
      minutes: form.get('minutes'),
    });
  if (!parsed.success) return fail('Enter 0–1440 actual minutes.');
  const changed = await db
    .update(timeBlockExceptions)
    .set({ actualMinutes: parsed.data.minutes, updatedAt: new Date() })
    .where(
      and(
        eq(timeBlockExceptions.userId, userId),
        eq(timeBlockExceptions.blockId, parsed.data.blockId),
        eq(timeBlockExceptions.occurrenceDate, parsed.data.occurrenceDate),
        eq(timeBlockExceptions.status, 'completed'),
      ),
    )
    .returning({ id: timeBlockExceptions.id });
  if (!changed.length) return fail('Completed session not found.');
  refresh();
  return { success: 'Actual minutes recorded.' };
}

export async function manageTimeOffAction(
  _: LifeActionState,
  form: FormData,
): Promise<PlanningState> {
  const userId = (await requireUser()).id;
  const mode = z.enum(['preview', 'save', 'cancel']).safeParse(form.get('mode'));
  const parsed = timeOffInput.safeParse({
    id: form.get('id') || '',
    date: form.get('date'),
    type: form.get('type'),
    title: form.get('title') || '',
    note: form.get('note') || '',
    allDay: form.get('allDay') === 'on',
    start: form.get('start') || '',
    end: form.get('end') || '',
    selected: form.getAll('selected').map(String),
    confirm: form.get('confirm') === 'yes',
  });
  if (!mode.success || !parsed.success) return fail('Check the time-off fields.');
  const value = parsed.data;
  if (!value.allDay && (!value.start || !value.end || value.end <= value.start))
    return fail('Choose a valid time range.');
  const settings = await getUserSettings(userId);
  const today = toDateString(getTodayInTimezone(settings.timezone));
  if (mode.data !== 'cancel' && value.date < today)
    return fail('Plan time off for today or later.');
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`habitflow-schedule:${userId}`}, 0))`,
    );
    let existing = value.id
      ? (
          await tx
            .select()
            .from(timeOffDays)
            .where(and(eq(timeOffDays.userId, userId), eq(timeOffDays.id, value.id)))
            .limit(1)
        )[0]
      : null;
    if (value.id && !existing) return fail('Time-off plan not found.');
    if (mode.data === 'cancel') {
      if (!existing || existing.status !== 'active')
        return fail('Time-off plan is already cancelled.');
      const attached = await tx
        .select()
        .from(timeBlockExceptions)
        .where(
          and(
            eq(timeBlockExceptions.userId, userId),
            eq(timeBlockExceptions.timeOffId, existing.id),
          ),
        );
      const rules = await tx.select().from(timeBlocks).where(eq(timeBlocks.userId, userId));
      const revisions = await tx
        .select()
        .from(timeBlockRevisions)
        .where(eq(timeBlockRevisions.userId, userId));
      const exceptions = await tx
        .select()
        .from(timeBlockExceptions)
        .where(eq(timeBlockExceptions.userId, userId));
      const restoring: { date: string; start: string; end: string }[] = [];
      for (const item of attached) {
        if (item.status !== 'excused') continue;
        const block = rules.find((rule) => rule.id === item.blockId);
        if (!block) continue;
        const rule = ruleOn(block, revisions, item.occurrenceDate);
        const restoreDate = item.overrideDate ?? item.occurrenceDate;
        const restoreStart = item.overrideStartTime ?? rule.localStartTime;
        const restoreEnd = item.overrideEndTime ?? rule.localEndTime;
        const others = expandBlocks(rules, exceptions, restoreDate, restoreDate, revisions).filter(
          (other) =>
            !['skipped', 'excused'].includes(other.occurrenceStatus) &&
            !sameOccurrence(other, { id: block.id, originalDate: item.occurrenceDate }),
        );
        if (
          others.some((other) =>
            overlaps(other, {
              localStartTime: restoreStart,
              localEndTime: restoreEnd,
            }),
          ) ||
          restoring.some(
            (other) =>
              other.date === restoreDate &&
              overlaps(
                { localStartTime: other.start, localEndTime: other.end },
                { localStartTime: restoreStart, localEndTime: restoreEnd },
              ),
          )
        )
          return fail(`Restore ${rule.title} separately after resolving its schedule conflict.`);
        restoring.push({ date: restoreDate, start: restoreStart, end: restoreEnd });
      }
      for (const item of attached)
        if (item.status === 'excused')
          await tx
            .update(timeBlockExceptions)
            .set({ status: 'planned', reason: null, timeOffId: null, updatedAt: new Date() })
            .where(
              and(eq(timeBlockExceptions.userId, userId), eq(timeBlockExceptions.id, item.id)),
            );
      await tx
        .update(timeOffDays)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(and(eq(timeOffDays.userId, userId), eq(timeOffDays.id, existing.id)));
      return { success: 'Time off cancelled; its excused sessions were restored.' };
    }
    const duplicate = (
      await tx
        .select()
        .from(timeOffDays)
        .where(and(eq(timeOffDays.userId, userId), eq(timeOffDays.date, value.date)))
        .limit(1)
    )[0];
    if (duplicate && duplicate.id !== existing?.id) {
      if (duplicate.status !== 'cancelled')
        return fail('Time off already exists on this date. Edit or cancel it.');
      existing = duplicate;
    }
    if (existing && existing.date !== value.date)
      return fail('Cancel this day and create another to change its date.');
    const rules = await tx.select().from(timeBlocks).where(eq(timeBlocks.userId, userId));
    const revisions = await tx
      .select()
      .from(timeBlockRevisions)
      .where(eq(timeBlockRevisions.userId, userId));
    const exceptions = await tx
      .select()
      .from(timeBlockExceptions)
      .where(eq(timeBlockExceptions.userId, userId));
    const affected = expandBlocks(rules, exceptions, value.date, value.date, revisions).filter(
      (item) =>
        value.allDay || (item.localStartTime < value.end && value.start < item.localEndTime),
    );
    const fixed = affected.filter(
      (item) => item.isFixed && !['skipped', 'excused'].includes(item.occurrenceStatus),
    );
    const flexible = affected.filter(
      (item) =>
        !item.isFixed &&
        !['skipped', 'excused', 'completed', 'started'].includes(item.occurrenceStatus),
    );
    const keys = new Set(flexible.map((item) => `${item.id}:${item.originalDate}`));
    if (value.selected.some((key) => !keys.has(key)))
      return fail('Selected session is no longer available. Preview again.');
    if (mode.data === 'preview')
      return {
        success: `${fixed.length ? `Fixed commitments stay planned: ${fixed.map((item) => item.title).join(', ')}. ` : ''}${flexible.length ? `Flexible sessions: ${flexible.map((item) => item.title).join(', ')}. ` : ''}${value.selected.length} selected for excusal. No change saved.`,
        affected: flexible.map((item) => ({
          key: `${item.id}:${item.originalDate}`,
          title: item.title,
        })),
      };
    if (!value.confirm) return fail('Confirm this time-off plan and selected excusals.');
    const [saved] = existing
      ? await tx
          .update(timeOffDays)
          .set({
            type: value.type,
            title: value.title || null,
            note: value.note || null,
            allDay: value.allDay,
            localStartTime: value.allDay ? null : value.start,
            localEndTime: value.allDay ? null : value.end,
            status: 'active',
            updatedAt: new Date(),
          })
          .where(and(eq(timeOffDays.userId, userId), eq(timeOffDays.id, existing.id)))
          .returning({ id: timeOffDays.id })
      : await tx
          .insert(timeOffDays)
          .values({
            userId,
            date: value.date,
            type: value.type,
            title: value.title || null,
            note: value.note || null,
            allDay: value.allDay,
            localStartTime: value.allDay ? null : value.start,
            localEndTime: value.allDay ? null : value.end,
          })
          .returning({ id: timeOffDays.id });
    for (const item of flexible.filter((item) =>
      value.selected.includes(`${item.id}:${item.originalDate}`),
    )) {
      await tx
        .insert(timeBlockExceptions)
        .values({
          userId,
          blockId: item.id,
          occurrenceDate: item.originalDate,
          status: 'excused',
          reason: `${value.type} time off`,
          timeOffId: saved.id,
        })
        .onConflictDoUpdate({
          target: [timeBlockExceptions.blockId, timeBlockExceptions.occurrenceDate],
          set: {
            status: 'excused',
            reason: `${value.type} time off`,
            timeOffId: saved.id,
            updatedAt: new Date(),
          },
        });
    }
    return {
      success: `Time off saved. ${value.selected.length} flexible sessions excused; fixed commitments remain planned.`,
    };
  });
  if (result.success && mode.data !== 'preview') refresh();
  return result;
}

const gymTypes = {
  main: 'Main workout',
  light: 'Optional light workout',
  technique: 'Technique practice',
  mobility: 'Mobility/recovery',
} as const;
export async function manageOptionalGymAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      enabled: z.enum(['yes', 'no']),
      day: z.coerce.number().int().min(0).max(6),
      type: z.enum(['main', 'light', 'technique', 'mobility']),
      start: time,
      end: time,
      effectiveDate: z.iso.date(),
      allowOverlap: z.boolean(),
    })
    .safeParse({
      enabled: form.get('enabled'),
      day: form.get('day'),
      type: form.get('type'),
      start: form.get('start'),
      end: form.get('end'),
      effectiveDate: form.get('effectiveDate'),
      allowOverlap: form.get('allowOverlap') === 'on',
    });
  if (!parsed.success || parsed.data.end <= parsed.data.start)
    return fail('Check the optional workout day and time.');
  const settings = await getUserSettings(userId);
  if (parsed.data.effectiveDate < toDateString(getTodayInTimezone(settings.timezone)))
    return fail('Changes must begin today or later.');
  const value = parsed.data;
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`habitflow-schedule:${userId}`}, 0))`,
    );
    const rules = await tx.select().from(timeBlocks).where(eq(timeBlocks.userId, userId));
    const revisions = await tx
      .select()
      .from(timeBlockRevisions)
      .where(eq(timeBlockRevisions.userId, userId));
    const exceptions = await tx
      .select()
      .from(timeBlockExceptions)
      .where(eq(timeBlockExceptions.userId, userId));
    const block = rules.find((item) => item.templateKey === 'optional-gym-5');
    if (!block && value.enabled === 'no') return fail('Optional workout is already disabled.');
    const title = gymTypes[value.type];
    const mask = Array.from({ length: 7 }, (_, index) => (index === value.day ? '1' : '0')).join(
      '',
    );
    if (value.enabled === 'yes') {
      for (const date of futureBoundaryDates(value.effectiveDate, rules, revisions, exceptions)) {
        if (weekdayIndex(date) !== value.day) continue;
        const conflict = expandBlocks(rules, exceptions, date, date, revisions).find(
          (item) =>
            !['skipped', 'excused'].includes(item.occurrenceStatus) &&
            !(item.id === block?.id && item.originalDate === date) &&
            overlaps(item, { localStartTime: value.start, localEndTime: value.end }),
        );
        if (conflict && (conflict.isFixed || !value.allowOverlap))
          return fail(
            `Overlaps ${conflict.title}. Choose another time${conflict.isFixed ? '.' : ' or confirm a flexible overlap.'}`,
          );
      }
    }
    if (block) {
      const current = ruleOn(block, revisions, value.effectiveDate);
      if (
        value.effectiveDate === toDateString(getTodayInTimezone(settings.timezone)) &&
        current.weekdayMask[weekdayIndex(value.effectiveDate)] === '1'
      ) {
        const start = scheduledInstant(
          value.effectiveDate,
          current.localStartTime,
          settings.timezone,
        );
        if (!start || start <= serverNow())
          return fail('Today’s workout has begun. Choose a later effective date.');
      }
      await tx
        .insert(timeBlockRevisions)
        .values({
          userId,
          blockId: block.id,
          effectiveDate: value.effectiveDate,
          title,
          category: 'Fitness',
          localStartTime: value.start,
          localEndTime: value.end,
          weekdayMask: mask,
          status: value.enabled === 'yes' ? 'active' : 'archived',
          endDate: null,
          isFixed: false,
        })
        .onConflictDoUpdate({
          target: [timeBlockRevisions.blockId, timeBlockRevisions.effectiveDate],
          set: {
            title,
            localStartTime: value.start,
            localEndTime: value.end,
            weekdayMask: mask,
            status: value.enabled === 'yes' ? 'active' : 'archived',
          },
        });
      await tx
        .update(timeBlocks)
        .set({
          title,
          localStartTime: value.start,
          localEndTime: value.end,
          weekdayMask: mask,
          status: value.enabled === 'yes' ? 'active' : 'archived',
          updatedAt: new Date(),
        })
        .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, block.id)));
    } else {
      const [created] = await tx
        .insert(timeBlocks)
        .values({
          userId,
          title,
          category: 'Fitness',
          localStartTime: value.start,
          localEndTime: value.end,
          weekdayMask: mask,
          startDate: value.effectiveDate,
          isFixed: false,
          status: 'active',
          templateKey: 'optional-gym-5',
        })
        .returning({ id: timeBlocks.id });
      await tx.insert(timeBlockRevisions).values({
        userId,
        blockId: created.id,
        effectiveDate: value.effectiveDate,
        title,
        category: 'Fitness',
        localStartTime: value.start,
        localEndTime: value.end,
        weekdayMask: mask,
        status: 'active',
        isFixed: false,
      });
    }
    return {
      success:
        value.enabled === 'yes'
          ? 'Optional workout enabled.'
          : 'Optional workout disabled; history remains available.',
    };
  });
  if (result.success) refresh();
  return result;
}
