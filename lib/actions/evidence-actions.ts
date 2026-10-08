'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  applicationStageHistory,
  englishPractices,
  grammarMistakes,
  internshipApplications,
  interviewPractices,
  interviewTopics,
  metricEntries,
  milestoneCriteria,
  milestoneReviewHistory,
  milestoneReviews,
  subjectTopics,
  subjects,
  tasks,
  topicPractices,
} from '@/lib/db/schema';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';
import type { LifeActionState } from './life-actions';
import { canAcceptMilestone, validScoredAttempt } from '@/lib/evidence/summary';

const fail = (error: string): LifeActionState => ({ error });
const bad = (error: z.ZodError): LifeActionState =>
  fail(error.issues[0]?.message ?? 'Check the fields.');
const value = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const optionalDate = z.union([z.iso.date(), z.literal('')]).transform((item) => item || null);
const optionalId = z.union([z.uuid(), z.literal('')]).transform((item) => item || null);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((item) => item || null);
const optionalUrl = z
  .union([z.url({ protocol: /^https?$/ }), z.literal('')])
  .transform((item) => item || null);
const optionalRating = z
  .union([z.literal(''), z.coerce.number().int().min(1).max(5)])
  .transform((item) => (item === '' ? null : item));
const optionalMinutes = z
  .union([z.literal(''), z.coerce.number().int().min(1).max(1440)])
  .transform((item) => (item === '' ? null : item));
const title = z.string().trim().min(1).max(160);
const refresh = () => {
  for (const path of ['/goals', '/goals/evidence', '/review', '/today']) revalidatePath(path);
};
async function todayFor(userId: string) {
  const settings = await getUserSettings(userId);
  return toDateString(getTodayInTimezone(settings.timezone));
}

export async function saveTopicAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      id: optionalId,
      subjectId: z.uuid(),
      title,
      priority: z.coerce.number().int().min(1).max(3),
      status: z.enum([
        'not_started',
        'learning',
        'practising',
        'demonstrated_mastery',
        'needs_revision',
      ]),
      nextRevisionDate: optionalDate,
    })
    .safeParse({
      id: value(form, 'id'),
      subjectId: form.get('subjectId'),
      title: form.get('title'),
      priority: form.get('priority'),
      status: form.get('status'),
      nextRevisionDate: value(form, 'nextRevisionDate'),
    });
  if (!parsed.success) return bad(parsed.error);
  const input = parsed.data;
  if (
    !(
      await db
        .select({ id: subjects.id })
        .from(subjects)
        .where(and(eq(subjects.userId, userId), eq(subjects.id, input.subjectId)))
        .limit(1)
    )[0]
  )
    return fail('Subject not found.');
  if (input.id) {
    const changed = await db
      .update(subjectTopics)
      .set({
        subjectId: input.subjectId,
        title: input.title,
        priority: input.priority,
        status: input.status,
        nextRevisionDate: input.nextRevisionDate,
        updatedAt: new Date(),
      })
      .where(and(eq(subjectTopics.userId, userId), eq(subjectTopics.id, input.id)))
      .returning({ id: subjectTopics.id });
    if (!changed.length) return fail('Topic not found.');
  } else
    await db.insert(subjectTopics).values({
      userId,
      subjectId: input.subjectId,
      title: input.title,
      priority: input.priority,
      status: input.status,
      nextRevisionDate: input.nextRevisionDate,
    });
  refresh();
  return { success: 'Topic saved. Practice evidence remains separate from grades.' };
}

export async function addTopicPracticeAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const score = z.union([z.literal(''), z.coerce.number().int().min(0).max(10000)]);
  const parsed = z
    .object({
      topicId: z.uuid(),
      date: z.iso.date(),
      type: z.enum(['active_recall', 'quiz', 'past_paper', 'problem_solving', 'explanation']),
      correct: score,
      total: score,
      confidence: optionalRating,
      durationMinutes: optionalMinutes,
      note: optionalText(1000),
    })
    .safeParse({
      topicId: form.get('topicId'),
      date: form.get('date'),
      type: form.get('type'),
      correct: value(form, 'correct'),
      total: value(form, 'total'),
      confidence: value(form, 'confidence'),
      durationMinutes: value(form, 'durationMinutes'),
      note: value(form, 'note'),
    });
  if (!parsed.success) return bad(parsed.error);
  const input = parsed.data;
  if (
    !validScoredAttempt(
      input.correct === '' ? null : input.correct,
      input.total === '' ? null : input.total,
    )
  )
    return fail('Enter both score fields with 0 ≤ correct ≤ total and total above zero.');
  if (input.date > (await todayFor(userId))) return fail('Practice date cannot be in the future.');
  if (
    !(
      await db
        .select({ id: subjectTopics.id })
        .from(subjectTopics)
        .where(and(eq(subjectTopics.userId, userId), eq(subjectTopics.id, input.topicId)))
        .limit(1)
    )[0]
  )
    return fail('Topic not found.');
  await db.insert(topicPractices).values({
    userId,
    topicId: input.topicId,
    date: input.date,
    type: input.type,
    correct: input.correct === '' ? null : input.correct,
    total: input.total === '' ? null : input.total,
    confidence: input.confidence,
    durationMinutes: input.durationMinutes,
    note: input.note,
  });
  refresh();
  return { success: 'Practice evidence recorded.' };
}

export async function saveCriterionAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      id: optionalId,
      taskId: z.uuid(),
      title: z.string().trim().min(1).max(200),
      met: z.boolean(),
    })
    .safeParse({
      id: value(form, 'id'),
      taskId: form.get('taskId'),
      title: form.get('title'),
      met: form.get('met') === 'on',
    });
  if (!parsed.success) return bad(parsed.error);
  const input = parsed.data;
  const result = await db.transaction(async (tx) => {
    const milestone = (
      await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(eq(tasks.userId, userId), eq(tasks.id, input.taskId), eq(tasks.isMilestone, true)),
        )
        .for('update')
        .limit(1)
    )[0];
    if (!milestone) return fail('Milestone not found.');
    if (input.id) {
      const changed = await tx
        .update(milestoneCriteria)
        .set({ title: input.title, met: input.met, updatedAt: new Date() })
        .where(
          and(
            eq(milestoneCriteria.userId, userId),
            eq(milestoneCriteria.id, input.id),
            eq(milestoneCriteria.taskId, input.taskId),
          ),
        )
        .returning({ id: milestoneCriteria.id });
      if (!changed.length) return fail('Criterion not found.');
    } else
      await tx
        .insert(milestoneCriteria)
        .values({ userId, taskId: input.taskId, title: input.title, met: input.met });
    return { success: 'Quality criterion saved.' };
  });
  if (result.success) refresh();
  return result;
}

export async function saveMilestoneReviewAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      taskId: z.uuid(),
      state: z.enum(['not_reviewed', 'needs_improvements', 'meets_criteria']),
      reviewer: z.string().trim().min(1).max(80),
      reviewedOn: optionalDate,
      repositoryUrl: optionalUrl,
      testReference: optionalText(500),
      documentationUrl: optionalUrl,
      note: optionalText(2000),
    })
    .safeParse({
      taskId: form.get('taskId'),
      state: form.get('state'),
      reviewer: form.get('reviewer'),
      reviewedOn: value(form, 'reviewedOn'),
      repositoryUrl: value(form, 'repositoryUrl'),
      testReference: value(form, 'testReference'),
      documentationUrl: value(form, 'documentationUrl'),
      note: value(form, 'note'),
    });
  if (!parsed.success) return bad(parsed.error);
  const input = parsed.data;
  const result = await db.transaction(async (tx) => {
    const task = (
      await tx
        .select()
        .from(tasks)
        .where(
          and(eq(tasks.userId, userId), eq(tasks.id, input.taskId), eq(tasks.isMilestone, true)),
        )
        .for('update')
        .limit(1)
    )[0];
    if (!task) return fail('Milestone not found.');
    const criteria = await tx
      .select()
      .from(milestoneCriteria)
      .where(and(eq(milestoneCriteria.userId, userId), eq(milestoneCriteria.taskId, input.taskId)));
    if (input.state === 'meets_criteria' && !canAcceptMilestone(criteria))
      return fail('Define and meet each criterion before marking acceptance.');
    if (input.state === 'meets_criteria' && !input.reviewedOn)
      return fail('Record the review date.');
    await tx
      .insert(milestoneReviews)
      .values({ userId, ...input })
      .onConflictDoUpdate({
        target: [milestoneReviews.userId, milestoneReviews.taskId],
        set: { ...input, updatedAt: new Date() },
      });
    await tx.insert(milestoneReviewHistory).values({
      userId,
      ...input,
      criteriaSnapshot: JSON.stringify(
        criteria.map((item) => ({ title: item.title, met: item.met })),
      ),
    });
    return { success: 'Milestone review saved separately from task completion.' };
  });
  if (result.success) refresh();
  return result;
}

export async function addInterviewTopicAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      category: z.string().trim().min(1).max(80),
      title,
      roleTrack: z.enum(['Shared', 'SE', 'DevOps', 'QA']),
    })
    .safeParse({
      category: form.get('category'),
      title: form.get('title'),
      roleTrack: form.get('roleTrack'),
    });
  if (!parsed.success) return bad(parsed.error);
  await db.insert(interviewTopics).values({ userId, ...parsed.data });
  refresh();
  return { success: 'Interview topic added.' };
}
export async function addInterviewPracticeAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      topicId: z.uuid(),
      date: z.iso.date(),
      roleTrack: z.enum(['SE', 'DevOps', 'QA']),
      type: z.enum(['mock', 'technical_question', 'coding', 'explanation']),
      prompt: optionalText(2000),
      durationMinutes: optionalMinutes,
      correct: z.union([z.literal(''), z.coerce.number().int().min(0).max(10000)]),
      total: z.union([z.literal(''), z.coerce.number().int().min(0).max(10000)]),
      technical: optionalRating,
      approach: optionalRating,
      clarity: optionalRating,
      tradeoffs: optionalRating,
      externalRating: optionalRating,
      strengths: optionalText(1000),
      weaknesses: optionalText(1000),
      nextAction: optionalText(500),
    })
    .safeParse({
      topicId: form.get('topicId'),
      date: form.get('date'),
      roleTrack: form.get('roleTrack'),
      type: form.get('type'),
      prompt: value(form, 'prompt'),
      durationMinutes: value(form, 'durationMinutes'),
      correct: value(form, 'correct'),
      total: value(form, 'total'),
      technical: value(form, 'technical'),
      approach: value(form, 'approach'),
      clarity: value(form, 'clarity'),
      tradeoffs: value(form, 'tradeoffs'),
      externalRating: value(form, 'externalRating'),
      strengths: value(form, 'strengths'),
      weaknesses: value(form, 'weaknesses'),
      nextAction: value(form, 'nextAction'),
    });
  if (!parsed.success) return bad(parsed.error);
  const { correct, total, ...input } = parsed.data;
  if (!validScoredAttempt(correct === '' ? null : correct, total === '' ? null : total))
    return fail('Enter both score fields with 0 ≤ correct ≤ total and total above zero.');
  if (input.date > (await todayFor(userId))) return fail('Practice date cannot be in the future.');
  const topic = (
    await db
      .select()
      .from(interviewTopics)
      .where(and(eq(interviewTopics.userId, userId), eq(interviewTopics.id, input.topicId)))
      .limit(1)
  )[0];
  if (!topic || !['Shared', input.roleTrack].includes(topic.roleTrack))
    return fail('Choose a topic for this role.');
  await db.insert(interviewPractices).values({
    userId,
    ...input,
    correct: correct === '' ? null : correct,
    total: total === '' ? null : total,
  });
  refresh();
  return { success: 'Interview practice recorded as assessment evidence.' };
}
export async function createInterviewFollowUpAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return bad(id.error);
  const result = await db.transaction(async (tx) => {
    const practice = (
      await tx
        .select()
        .from(interviewPractices)
        .where(and(eq(interviewPractices.userId, userId), eq(interviewPractices.id, id.data)))
        .for('update')
        .limit(1)
    )[0];
    if (!practice) return fail('Practice not found.');
    if (!practice.nextAction) return fail('Add a next action to this practice first.');
    if (practice.followUpTaskId) return fail('Follow-up task already exists.');
    const [task] = await tx
      .insert(tasks)
      .values({
        userId,
        title: practice.nextAction.slice(0, 160),
        area: 'Interview Preparation',
        details: practice.weaknesses,
        status: 'todo',
      })
      .returning({ id: tasks.id });
    await tx
      .update(interviewPractices)
      .set({ followUpTaskId: task.id })
      .where(and(eq(interviewPractices.userId, userId), eq(interviewPractices.id, id.data)));
    return { success: 'Ordinary follow-up task created.' };
  });
  if (result.success) refresh();
  return result;
}

export async function addEnglishPracticeAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      date: z.iso.date(),
      type: z.enum([
        'free_speaking',
        'technical_explanation',
        'mock_interview',
        'conversation',
        'grammar',
        'pronunciation',
      ]),
      topic: title,
      durationMinutes: z.coerce.number().int().min(1).max(1440),
      fluency: optionalRating,
      grammar: optionalRating,
      clarity: optionalRating,
      pronunciation: optionalRating,
      confidence: optionalRating,
      reviewer: optionalText(80),
      reflection: optionalText(2000),
    })
    .safeParse({
      date: form.get('date'),
      type: form.get('type'),
      topic: form.get('topic'),
      durationMinutes: form.get('durationMinutes'),
      fluency: value(form, 'fluency'),
      grammar: value(form, 'grammar'),
      clarity: value(form, 'clarity'),
      pronunciation: value(form, 'pronunciation'),
      confidence: value(form, 'confidence'),
      reviewer: value(form, 'reviewer'),
      reflection: value(form, 'reflection'),
    });
  if (!parsed.success) return bad(parsed.error);
  if (parsed.data.date > (await todayFor(userId)))
    return fail('Practice date cannot be in the future.');
  await db.insert(englishPractices).values({ userId, ...parsed.data });
  refresh();
  return {
    success: 'English practice recorded. Ratings are self-assessed unless a reviewer is named.',
  };
}
export async function addGrammarMistakeAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      practiceId: optionalId,
      original: z.string().trim().min(1).max(1000),
      corrected: z.string().trim().min(1).max(1000),
      category: z.string().trim().min(1).max(80),
      note: optionalText(1000),
    })
    .safeParse({
      practiceId: value(form, 'practiceId'),
      original: form.get('original'),
      corrected: form.get('corrected'),
      category: form.get('category'),
      note: value(form, 'note'),
    });
  if (!parsed.success) return bad(parsed.error);
  if (
    parsed.data.practiceId &&
    !(
      await db
        .select({ id: englishPractices.id })
        .from(englishPractices)
        .where(
          and(eq(englishPractices.userId, userId), eq(englishPractices.id, parsed.data.practiceId)),
        )
        .limit(1)
    )[0]
  )
    return fail('Practice not found.');
  await db.insert(grammarMistakes).values({ userId, ...parsed.data });
  refresh();
  return { success: 'Correction recorded.' };
}
export async function reviewGrammarMistakeAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return bad(id.error);
  const changed = await db
    .update(grammarMistakes)
    .set({ reviewedAt: new Date() })
    .where(and(eq(grammarMistakes.userId, userId), eq(grammarMistakes.id, id.data)))
    .returning({ id: grammarMistakes.id });
  if (!changed.length) return fail('Correction not found.');
  refresh();
  return { success: 'Correction marked reviewed.' };
}

export async function changeWeightAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      id: z.uuid(),
      operation: z.enum(['edit', 'delete']),
      date: z.iso.date(),
      value: z.coerce.number().finite().min(20).max(500),
      note: optionalText(500),
      confirm: z.boolean(),
    })
    .safeParse({
      id: form.get('id'),
      operation: form.get('operation'),
      date: form.get('date'),
      value: form.get('value'),
      note: value(form, 'note'),
      confirm: form.get('confirm') === 'on',
    });
  if (!parsed.success) return bad(parsed.error);
  const input = parsed.data;
  if (input.operation === 'delete') {
    if (!input.confirm) return fail('Confirm removal of this measurement.');
    const removed = await db
      .delete(metricEntries)
      .where(
        and(
          eq(metricEntries.userId, userId),
          eq(metricEntries.id, input.id),
          eq(metricEntries.type, 'Body weight'),
          eq(metricEntries.unit, 'kg'),
        ),
      )
      .returning({ id: metricEntries.id });
    if (!removed.length) return fail('Weight measurement not found.');
  } else {
    if (input.date > (await todayFor(userId)))
      return fail('Measurement date cannot be in the future.');
    const changed = await db
      .update(metricEntries)
      .set({ date: input.date, value: input.value, note: input.note })
      .where(
        and(
          eq(metricEntries.userId, userId),
          eq(metricEntries.id, input.id),
          eq(metricEntries.type, 'Body weight'),
          eq(metricEntries.unit, 'kg'),
        ),
      )
      .returning({ id: metricEntries.id });
    if (!changed.length) return fail('Weight measurement not found.');
  }
  refresh();
  return {
    success:
      input.operation === 'delete' ? 'Erroneous weight entry removed.' : 'Weight entry corrected.',
  };
}

export async function addWeightAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      date: z.iso.date(),
      value: z.coerce.number().finite().min(20).max(500),
      note: optionalText(500),
    })
    .safeParse({ date: form.get('date'), value: form.get('value'), note: value(form, 'note') });
  if (!parsed.success) return bad(parsed.error);
  if (parsed.data.date > (await todayFor(userId)))
    return fail('Measurement date cannot be in the future.');
  await db.insert(metricEntries).values({
    userId,
    date: parsed.data.date,
    type: 'Body weight',
    unit: 'kg',
    value: parsed.data.value,
    note: parsed.data.note,
  });
  refresh();
  return { success: 'Actual body weight recorded.' };
}

const stages = z.enum([
  'saved',
  'applied',
  'online_assessment',
  'technical_interview',
  'hr_interview',
  'offer',
  'rejected',
  'withdrawn',
  'custom',
]);
export async function saveApplicationAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      id: optionalId,
      company: title,
      roleTitle: title,
      roleTrack: z.enum(['SE', 'DevOps', 'QA', 'Other']),
      url: optionalUrl,
      location: optionalText(160),
      arrangement: z.enum(['', 'onsite', 'hybrid', 'remote']).transform((item) => item || null),
      appliedOn: optionalDate,
      followUpDate: optionalDate,
      contactName: optionalText(160),
      note: optionalText(2000),
    })
    .safeParse({
      id: value(form, 'id'),
      company: form.get('company'),
      roleTitle: form.get('roleTitle'),
      roleTrack: form.get('roleTrack'),
      url: value(form, 'url'),
      location: value(form, 'location'),
      arrangement: value(form, 'arrangement'),
      appliedOn: value(form, 'appliedOn'),
      followUpDate: value(form, 'followUpDate'),
      contactName: value(form, 'contactName'),
      note: value(form, 'note'),
    });
  if (!parsed.success) return bad(parsed.error);
  const { id, ...input } = parsed.data;
  if (input.appliedOn && input.appliedOn > (await todayFor(userId)))
    return fail('Application date cannot be in the future.');
  if (id) {
    const current = (
      await db
        .select({ stage: internshipApplications.stage })
        .from(internshipApplications)
        .where(and(eq(internshipApplications.userId, userId), eq(internshipApplications.id, id)))
        .limit(1)
    )[0];
    if (!current) return fail('Application not found.');
    if (current.stage === 'saved' && input.appliedOn)
      return fail('Use Record stage to mark this saved opportunity as applied.');
    if (!['saved', 'withdrawn'].includes(current.stage) && !input.appliedOn)
      return fail('Keep the actual application date for a submitted application.');
    const changed = await db
      .update(internshipApplications)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(internshipApplications.userId, userId), eq(internshipApplications.id, id)))
      .returning({ id: internshipApplications.id });
    if (!changed.length) return fail('Application not found.');
  } else {
    await db.transaction(async (tx) => {
      const stage = input.appliedOn ? 'applied' : 'saved';
      const [created] = await tx
        .insert(internshipApplications)
        .values({ userId, ...input, stage })
        .returning({ id: internshipApplications.id });
      await tx
        .insert(applicationStageHistory)
        .values({ userId, applicationId: created.id, fromStage: null, toStage: stage });
    });
  }
  refresh();
  return {
    success: id
      ? 'Application updated.'
      : input.appliedOn
        ? 'Submitted application recorded.'
        : 'Opportunity saved; it is not counted as submitted.',
  };
}
export async function changeApplicationStageAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z.object({ id: z.uuid(), stage: stages, appliedOn: optionalDate }).safeParse({
    id: form.get('id'),
    stage: form.get('stage'),
    appliedOn: value(form, 'appliedOn'),
  });
  if (!parsed.success) return bad(parsed.error);
  const input = parsed.data;
  if (input.appliedOn && input.appliedOn > (await todayFor(userId)))
    return fail('Application date cannot be in the future.');
  const result = await db.transaction(async (tx) => {
    const current = (
      await tx
        .select()
        .from(internshipApplications)
        .where(
          and(eq(internshipApplications.userId, userId), eq(internshipApplications.id, input.id)),
        )
        .for('update')
        .limit(1)
    )[0];
    if (!current) return fail('Application not found.');
    if (current.stage === input.stage) return fail('Application is already at this stage.');
    const appliedOn = input.appliedOn ?? current.appliedOn;
    if (!['saved', 'withdrawn'].includes(input.stage) && !appliedOn)
      return fail('Record the actual application date before advancing.');
    await tx
      .update(internshipApplications)
      .set({ stage: input.stage, appliedOn, updatedAt: new Date() })
      .where(
        and(eq(internshipApplications.userId, userId), eq(internshipApplications.id, input.id)),
      );
    await tx
      .insert(applicationStageHistory)
      .values({ userId, applicationId: input.id, fromStage: current.stage, toStage: input.stage });
    return { success: 'Application stage recorded in history.' };
  });
  if (result.success) refresh();
  return result;
}
export async function createApplicationFollowUpAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return bad(id.error);
  const result = await db.transaction(async (tx) => {
    const application = (
      await tx
        .select()
        .from(internshipApplications)
        .where(
          and(eq(internshipApplications.userId, userId), eq(internshipApplications.id, id.data)),
        )
        .for('update')
        .limit(1)
    )[0];
    if (!application) return fail('Application not found.');
    if (!application.followUpDate) return fail('Choose a follow-up date first.');
    if (application.followUpTaskId) return fail('Follow-up task already exists.');
    const [task] = await tx
      .insert(tasks)
      .values({
        userId,
        title: `Follow up: ${application.company}`.slice(0, 160),
        area: 'Career',
        dueDate: application.followUpDate,
        status: 'todo',
        details: `${application.roleTitle} (${application.roleTrack})`,
      })
      .returning({ id: tasks.id });
    await tx
      .update(internshipApplications)
      .set({ followUpTaskId: task.id, updatedAt: new Date() })
      .where(
        and(eq(internshipApplications.userId, userId), eq(internshipApplications.id, id.data)),
      );
    return { success: 'Ordinary follow-up task created.' };
  });
  if (result.success) refresh();
  return result;
}
