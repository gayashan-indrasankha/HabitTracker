'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
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
import { getBlocksForRange } from '@/lib/dal/life';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';
import { expandBlocks, occursOn, overlaps, weekdayIndex } from '@/lib/planning/time-blocks';
import {
  BlockSchema,
  DayModeSchema,
  ExceptionSchema,
  GoalSchema,
  MetricSchema,
  ProjectSchema,
  SubjectSchema,
  TaskSchema,
} from '@/lib/validations/life';

export type LifeActionState = { error?: string; success?: string };
const fail = (error: string): LifeActionState => ({ error });
const invalid = (error: z.ZodError): LifeActionState =>
  fail(error.issues[0]?.message ?? 'Check the form fields.');
function refresh() {
  for (const route of ['/today', '/week', '/goals', '/review']) revalidatePath(route);
}
const nullable = (form: FormData, key: string) => String(form.get(key) ?? '');
const checked = (form: FormData, key: string) => form.get(key) === 'on';

export async function createGoalAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = GoalSchema.safeParse({
    area: nullable(form, 'area'),
    title: nullable(form, 'title'),
    description: nullable(form, 'description'),
    targetDate: nullable(form, 'targetDate'),
    priority: nullable(form, 'priority'),
    targetValue: nullable(form, 'targetValue'),
    targetUnit: nullable(form, 'targetUnit'),
  });
  if (!parsed.success) return invalid(parsed.error);
  await db.insert(goals).values({ userId, ...parsed.data });
  refresh();
  return { success: 'Goal created.' };
}

export async function createProjectAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = ProjectSchema.safeParse({
    name: nullable(form, 'name'),
    description: nullable(form, 'description'),
    type: nullable(form, 'type'),
    goalId: nullable(form, 'goalId'),
    deadline: nullable(form, 'deadline'),
    repositoryUrl: nullable(form, 'repositoryUrl'),
  });
  if (!parsed.success) return invalid(parsed.error);
  if (
    parsed.data.goalId &&
    !(
      await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, parsed.data.goalId), eq(goals.userId, userId)))
        .limit(1)
    )[0]
  )
    return fail('Goal not found.');
  await db.insert(projects).values({ userId, ...parsed.data });
  refresh();
  return { success: 'Project created.' };
}

export async function updateGoalStatusAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(['active', 'paused', 'completed', 'cancelled']) })
    .safeParse({ id: form.get('id'), status: form.get('status') });
  if (!parsed.success) return invalid(parsed.error);
  const changed = await db
    .update(goals)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(goals.userId, userId), eq(goals.id, parsed.data.id)))
    .returning({ id: goals.id });
  if (!changed.length) return fail('Goal not found.');
  refresh();
  return { success: 'Goal updated.' };
}

export async function updateProjectStatusAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(['active', 'paused', 'completed', 'cancelled']) })
    .safeParse({ id: form.get('id'), status: form.get('status') });
  if (!parsed.success) return invalid(parsed.error);
  const changed = await db
    .update(projects)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(projects.userId, userId), eq(projects.id, parsed.data.id)))
    .returning({ id: projects.id });
  if (!changed.length) return fail('Project not found.');
  refresh();
  return { success: 'Project updated.' };
}

export async function createTaskAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = TaskSchema.safeParse({
    title: nullable(form, 'title'),
    details: nullable(form, 'details'),
    area: nullable(form, 'area'),
    priority: nullable(form, 'priority'),
    estimatedMinutes: nullable(form, 'estimatedMinutes'),
    dueDate: nullable(form, 'dueDate'),
    scheduledDate: nullable(form, 'scheduledDate'),
    goalId: nullable(form, 'goalId'),
    projectId: nullable(form, 'projectId'),
    isMilestone: checked(form, 'isMilestone'),
  });
  if (!parsed.success) return invalid(parsed.error);
  const { goalId, projectId } = parsed.data;
  if (
    goalId &&
    !(
      await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
        .limit(1)
    )[0]
  )
    return fail('Goal not found.');
  if (
    projectId &&
    !(
      await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .limit(1)
    )[0]
  )
    return fail('Project not found.');
  await db.insert(tasks).values({ userId, ...parsed.data });
  refresh();
  return { success: 'Task added.' };
}

export async function editTaskAction(_: LifeActionState, form: FormData): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const id = z.uuid().safeParse(form.get('id'));
  const parsed = TaskSchema.safeParse({
    title: nullable(form, 'title'),
    details: nullable(form, 'details'),
    area: nullable(form, 'area'),
    priority: nullable(form, 'priority'),
    estimatedMinutes: nullable(form, 'estimatedMinutes'),
    dueDate: nullable(form, 'dueDate'),
    scheduledDate: nullable(form, 'scheduledDate'),
    goalId: nullable(form, 'goalId'),
    projectId: nullable(form, 'projectId'),
    isMilestone: checked(form, 'isMilestone'),
  });
  if (!id.success || !parsed.success) return fail('Check the task fields.');
  const current = (
    await db
      .select({ scheduledDate: tasks.scheduledDate })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id.data)))
      .limit(1)
  )[0];
  if (!current) return fail('Task not found.');
  if (
    parsed.data.goalId &&
    !(
      await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, parsed.data.goalId), eq(goals.userId, userId)))
        .limit(1)
    )[0]
  )
    return fail('Goal not found.');
  if (
    parsed.data.projectId &&
    !(
      await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, parsed.data.projectId), eq(projects.userId, userId)))
        .limit(1)
    )[0]
  )
    return fail('Project not found.');
  await db
    .update(tasks)
    .set({
      ...parsed.data,
      ...(parsed.data.scheduledDate !== current.scheduledDate ? { dailyPriority: null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id.data)));
  refresh();
  return { success: 'Task edited.' };
}

export async function updateTaskAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      id: z.uuid(),
      status: z.enum(['todo', 'in_progress', 'done', 'cancelled']),
      scheduledDate: z.union([z.iso.date(), z.literal('')]).optional(),
      actualMinutes: z.union([z.literal(''), z.coerce.number().int().min(0).max(1440)]).optional(),
    })
    .safeParse({
      id: form.get('id'),
      status: form.get('status'),
      scheduledDate: form.get('scheduledDate') ?? undefined,
      actualMinutes: form.get('actualMinutes') ?? undefined,
    });
  if (!parsed.success) return invalid(parsed.error);
  const previous = (
    await db
      .select({ status: tasks.status, completedAt: tasks.completedAt })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, parsed.data.id)))
      .limit(1)
  )[0];
  if (!previous) return fail('Task not found.');
  const updated = await db
    .update(tasks)
    .set({
      status: parsed.data.status,
      ...(parsed.data.scheduledDate !== undefined
        ? { scheduledDate: parsed.data.scheduledDate || null, dailyPriority: null }
        : {}),
      ...(parsed.data.actualMinutes !== undefined
        ? { actualMinutes: parsed.data.actualMinutes === '' ? null : parsed.data.actualMinutes }
        : {}),
      completedAt: parsed.data.status === 'done' ? (previous.completedAt ?? new Date()) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, parsed.data.id)))
    .returning({ id: tasks.id });
  if (!updated.length) return fail('Task not found.');
  refresh();
  return { success: 'Task updated.' };
}

export async function selectPriorityAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({ id: z.uuid(), date: z.iso.date(), rank: z.coerce.number().int().min(1).max(3) })
    .safeParse({ id: form.get('id'), date: form.get('date'), rank: form.get('rank') });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)))
        .limit(1);
      if (!owned.length) throw new Error('missing');
      await tx
        .update(tasks)
        .set({ dailyPriority: null })
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.scheduledDate, parsed.data.date),
            eq(tasks.dailyPriority, parsed.data.rank),
          ),
        );
      await tx
        .update(tasks)
        .set({
          dailyPriority: parsed.data.rank,
          scheduledDate: parsed.data.date,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)));
    });
  } catch {
    return fail('Could not select this priority. Refresh and try again.');
  }
  refresh();
  return { success: 'Priority selected.' };
}

export async function setDayModeAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const date = z.iso.date().safeParse(form.get('date'));
  const mode = DayModeSchema.safeParse(form.get('mode'));
  if (!date.success || !mode.success) return fail('Choose a valid date and day mode.');
  const settings = await getUserSettings(userId);
  if (date.data !== toDateString(getTodayInTimezone(settings.timezone)))
    return fail('Day mode can only be changed for today.');
  await db
    .insert(dayPlans)
    .values({ userId, date: date.data, mode: mode.data })
    .onConflictDoUpdate({
      target: [dayPlans.userId, dayPlans.date],
      set: { mode: mode.data, updatedAt: new Date() },
    });
  refresh();
  return { success: 'Day mode saved.' };
}

export async function createBlockAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const oneOff = checked(form, 'oneOff');
  const startDate = nullable(form, 'startDate');
  if (oneOff && !z.iso.date().safeParse(startDate).success)
    return fail('Choose a valid one-off date.');
  const mask = oneOff
    ? Array.from({ length: 7 }, (_, index) => (index === weekdayIndex(startDate) ? '1' : '0')).join(
        '',
      )
    : nullable(form, 'weekdayMask');
  const parsed = BlockSchema.safeParse({
    title: nullable(form, 'title'),
    category: nullable(form, 'category'),
    localStartTime: nullable(form, 'localStartTime'),
    localEndTime: nullable(form, 'localEndTime'),
    weekdayMask: mask,
    startDate,
    endDate: oneOff ? startDate : nullable(form, 'endDate'),
    isFixed: checked(form, 'isFixed'),
    taskId: nullable(form, 'taskId'),
    goalId: nullable(form, 'goalId'),
    projectId: nullable(form, 'projectId'),
    allowOverlap: checked(form, 'allowOverlap'),
  });
  if (!parsed.success) return invalid(parsed.error);
  if (
    parsed.data.taskId &&
    !(
      await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, parsed.data.taskId), eq(tasks.userId, userId)))
        .limit(1)
    )[0]
  )
    return fail('Task not found.');
  if (
    parsed.data.goalId &&
    !(
      await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, parsed.data.goalId), eq(goals.userId, userId)))
        .limit(1)
    )[0]
  )
    return fail('Goal not found.');
  if (
    parsed.data.projectId &&
    !(
      await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, parsed.data.projectId), eq(projects.userId, userId)))
        .limit(1)
    )[0]
  )
    return fail('Project not found.');
  const { allowOverlap, ...values } = parsed.data;
  const existing = await db.select().from(timeBlocks).where(eq(timeBlocks.userId, userId));
  const conflict = existing.find(
    (block) =>
      block.status === 'active' &&
      block.startDate <= (values.endDate ?? '9999-12-31') &&
      (!block.endDate || block.endDate >= values.startDate) &&
      [...values.weekdayMask].some(
        (bit, index) => bit === '1' && block.weekdayMask[index] === '1',
      ) &&
      overlaps(block, values),
  );
  if (conflict && (conflict.isFixed || !allowOverlap))
    return fail(
      `Overlaps ${conflict.title}. Choose another time${conflict.isFixed ? '.' : ' or confirm a flexible overlap.'}`,
    );
  await db.insert(timeBlocks).values({ userId, ...values });
  refresh();
  return { success: 'Time block added.' };
}

export async function updateBlockStatusAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(['active', 'paused', 'archived']) })
    .safeParse({ id: form.get('id'), status: form.get('status') });
  if (!parsed.success) return invalid(parsed.error);
  const updated = await db
    .update(timeBlocks)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, parsed.data.id)))
    .returning({ id: timeBlocks.id });
  if (!updated.length) return fail('Time block not found.');
  refresh();
  return { success: 'Time block updated.' };
}

export async function editBlockAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      id: z.uuid(),
      title: z.string().trim().min(1).max(160),
      category: z.string().trim().min(1).max(80),
      localStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      localEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      allowOverlap: z.boolean(),
    })
    .safeParse({
      id: form.get('id'),
      title: form.get('title'),
      category: form.get('category'),
      localStartTime: form.get('localStartTime'),
      localEndTime: form.get('localEndTime'),
      allowOverlap: checked(form, 'allowOverlap'),
    });
  if (!parsed.success) return invalid(parsed.error);
  const { id, allowOverlap, ...values } = parsed.data;
  if (values.localEndTime <= values.localStartTime)
    return fail('End time must be after start time.');
  const block = (
    await db
      .select()
      .from(timeBlocks)
      .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, id)))
      .limit(1)
  )[0];
  if (!block) return fail('Time block not found.');
  const existing = await db.select().from(timeBlocks).where(eq(timeBlocks.userId, userId));
  const conflict = existing.find(
    (item) =>
      item.id !== id &&
      item.status === 'active' &&
      item.startDate <= (block.endDate ?? '9999-12-31') &&
      (!item.endDate || item.endDate >= block.startDate) &&
      [...block.weekdayMask].some((bit, index) => bit === '1' && item.weekdayMask[index] === '1') &&
      overlaps(item, values),
  );
  if (conflict && (conflict.isFixed || !allowOverlap))
    return fail(
      `Overlaps ${conflict.title}. Choose another time${conflict.isFixed ? '.' : ' or confirm a flexible overlap.'}`,
    );
  await db
    .update(timeBlocks)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, id)));
  refresh();
  return { success: 'Time block edited.' };
}

export async function updateOccurrenceAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = ExceptionSchema.safeParse({
    blockId: form.get('blockId'),
    occurrenceDate: form.get('occurrenceDate'),
    status: form.get('status'),
    overrideDate: nullable(form, 'overrideDate'),
    overrideStartTime: nullable(form, 'overrideStartTime'),
    overrideEndTime: nullable(form, 'overrideEndTime'),
    reason: nullable(form, 'reason'),
    allowOverlap: checked(form, 'allowOverlap'),
  });
  if (!parsed.success) return invalid(parsed.error);
  const block = (
    await db
      .select()
      .from(timeBlocks)
      .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, parsed.data.blockId)))
      .limit(1)
  )[0];
  if (!block || !occursOn(block, parsed.data.occurrenceDate))
    return fail('Scheduled occurrence not found.');
  if (block.isFixed && ['skipped', 'rescheduled'].includes(parsed.data.status))
    return fail(
      'Fixed commitments cannot be skipped or moved here. Edit the series intentionally.',
    );
  if (parsed.data.status === 'rescheduled' && !parsed.data.overrideDate)
    return fail('Choose a new date.');
  const previous = (
    await db
      .select()
      .from(timeBlockExceptions)
      .where(
        and(
          eq(timeBlockExceptions.userId, userId),
          eq(timeBlockExceptions.blockId, block.id),
          eq(timeBlockExceptions.occurrenceDate, parsed.data.occurrenceDate),
        ),
      )
      .limit(1)
  )[0];
  const retained =
    ['started', 'completed'].includes(parsed.data.status) && previous
      ? {
          ...parsed.data,
          overrideDate: previous.overrideDate,
          overrideStartTime: previous.overrideStartTime,
          overrideEndTime: previous.overrideEndTime,
        }
      : parsed.data;
  const startTime = retained.overrideStartTime ?? block.localStartTime;
  const endTime = retained.overrideEndTime ?? block.localEndTime;
  if (endTime <= startTime) return fail('End time must be after start time.');
  if (parsed.data.status === 'rescheduled') {
    const targetDate = retained.overrideDate ?? retained.occurrenceDate;
    const { rules, exceptions } = await getBlocksForRange(userId, targetDate, targetDate);
    const conflict = expandBlocks(rules, exceptions, targetDate, targetDate).find(
      (item) =>
        item.id !== block.id &&
        overlaps(item, { localStartTime: startTime, localEndTime: endTime }),
    );
    if (conflict && (conflict.isFixed || !parsed.data.allowOverlap))
      return fail(
        `Overlaps ${conflict.title}. Choose another time${conflict.isFixed ? '.' : ' or confirm a flexible overlap.'}`,
      );
  }
  const { allowOverlap: _allowOverlap, ...values } = retained;
  void _allowOverlap;
  await db
    .insert(timeBlockExceptions)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: [timeBlockExceptions.blockId, timeBlockExceptions.occurrenceDate],
      set: { ...values, updatedAt: new Date() },
    });
  refresh();
  return { success: 'Occurrence updated.' };
}

export async function saveSubjectAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = SubjectSchema.safeParse({
    slot: form.get('slot'),
    name: nullable(form, 'name'),
    targetGrade: nullable(form, 'targetGrade'),
    actualGrade: nullable(form, 'actualGrade'),
  });
  if (!parsed.success) return invalid(parsed.error);
  await db
    .insert(subjects)
    .values({ userId, ...parsed.data })
    .onConflictDoUpdate({
      target: [subjects.userId, subjects.slot],
      set: { ...parsed.data, updatedAt: new Date() },
    });
  refresh();
  return { success: 'Subject saved.' };
}

export async function addAssessmentAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      subjectId: z.uuid(),
      title: z.string().trim().min(1).max(160),
      dueDate: z.union([z.iso.date(), z.literal('')]).transform((value) => value || null),
    })
    .safeParse({
      subjectId: form.get('subjectId'),
      title: form.get('title'),
      dueDate: nullable(form, 'dueDate'),
    });
  if (!parsed.success) return invalid(parsed.error);
  if (
    !(
      await db
        .select({ id: subjects.id })
        .from(subjects)
        .where(and(eq(subjects.id, parsed.data.subjectId), eq(subjects.userId, userId)))
        .limit(1)
    )[0]
  )
    return fail('Subject not found.');
  await db.insert(subjectAssessments).values({ userId, ...parsed.data });
  refresh();
  return { success: 'Assessment added.' };
}

export async function updateAssessmentAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(['todo', 'done']), actualGrade: z.string().max(20) })
    .safeParse({
      id: form.get('id'),
      status: form.get('status'),
      actualGrade: nullable(form, 'actualGrade'),
    });
  if (!parsed.success) return invalid(parsed.error);
  const changed = await db
    .update(subjectAssessments)
    .set({
      status: parsed.data.status,
      actualGrade: parsed.data.actualGrade || null,
      updatedAt: new Date(),
    })
    .where(and(eq(subjectAssessments.userId, userId), eq(subjectAssessments.id, parsed.data.id)))
    .returning({ id: subjectAssessments.id });
  if (!changed.length) return fail('Assessment not found.');
  refresh();
  return { success: 'Assessment updated.' };
}

export async function addMetricAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = MetricSchema.safeParse({
    date: form.get('date'),
    type: nullable(form, 'type'),
    value: form.get('value'),
    unit: nullable(form, 'unit'),
    note: nullable(form, 'note'),
  });
  if (!parsed.success) return invalid(parsed.error);
  await db.insert(metricEntries).values({ userId, ...parsed.data });
  refresh();
  return { success: 'Measurement recorded.' };
}

export async function saveReviewAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const weekStart = z.iso.date().safeParse(form.get('weekStart'));
  if (!weekStart.success) return fail('Choose a valid week.');
  const keys = [
    'academic',
    'industry',
    'career',
    'interview',
    'english',
    'fitness',
    'sleepAttention',
    'obstacles',
    'nextWins',
  ];
  const answers: Record<string, string> = {};
  for (const key of keys) {
    const value = nullable(form, key).trim();
    if (value.length > 2000) return fail('Keep each answer under 2,000 characters.');
    answers[key] = value;
  }
  const completedAt = checked(form, 'complete') ? new Date() : null;
  await db
    .insert(weeklyReviews)
    .values({ userId, weekStart: weekStart.data, answers: JSON.stringify(answers), completedAt })
    .onConflictDoUpdate({
      target: [weeklyReviews.userId, weeklyReviews.weekStart],
      set: { answers: JSON.stringify(answers), completedAt, updatedAt: new Date() },
    });
  refresh();
  return { success: completedAt ? 'Weekly review completed.' : 'Review draft saved.' };
}
