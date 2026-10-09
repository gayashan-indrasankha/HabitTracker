'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  goals,
  habitScheduleRevisions,
  habits,
  projects,
  subjects,
  timeBlocks,
  userSettings,
} from '@/lib/db/schema';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';
import type { LifeActionState } from './life-actions';

const sections = z.enum([
  'university',
  'industry',
  'career',
  'interview',
  'english',
  'fitness',
  'nutrition',
  'recovery',
  'review',
]);
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export async function applyLifeTemplateAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  const parsed = z
    .object({
      sections: z.array(sections).min(1),
      mondayStart: clock,
      mondayEnd: clock,
      tuesdayStart: clock,
      tuesdayEnd: clock,
      calories: z.coerce.number().int().min(1000).max(6000),
      protein: z.coerce.number().int().min(20).max(400),
    })
    .safeParse({
      sections: form.getAll('section'),
      mondayStart: form.get('mondayStart'),
      mondayEnd: form.get('mondayEnd'),
      tuesdayStart: form.get('tuesdayStart'),
      tuesdayEnd: form.get('tuesdayEnd'),
      calories: form.get('calories'),
      protein: form.get('protein'),
    });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Check your template choices.' };
  const input = parsed.data;
  if (input.mondayEnd <= input.mondayStart || input.tuesdayEnd <= input.tuesdayStart)
    return { error: 'Lecture end time must be after start time.' };
  const savedSettings = (
    await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1)
  )[0];
  const today = toDateString(getTodayInTimezone(savedSettings?.timezone ?? 'Asia/Colombo'));
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(userSettings)
        .values({ userId, timezone: 'Asia/Colombo', weekStartsOn: 1, theme: 'system' })
        .onConflictDoNothing();
      async function goal(
        key: string,
        area: string,
        title: string,
        targetValue?: number,
        targetUnit?: string,
      ) {
        await tx
          .insert(goals)
          .values({ userId, templateKey: key, area, title, targetValue, targetUnit })
          .onConflictDoNothing();
        return (
          await tx
            .select({ id: goals.id })
            .from(goals)
            .where(and(eq(goals.userId, userId), eq(goals.templateKey, key)))
            .limit(1)
        )[0].id;
      }
      async function project(key: string, name: string, type: string, goalId: string) {
        await tx
          .insert(projects)
          .values({ userId, templateKey: key, name, type, goalId })
          .onConflictDoNothing();
      }
      async function block(
        key: string,
        title: string,
        category: string,
        weekdayMask: string,
        localStartTime: string,
        localEndTime: string,
        isFixed = false,
      ) {
        await tx
          .insert(timeBlocks)
          .values({
            userId,
            templateKey: key,
            title,
            category,
            weekdayMask,
            localStartTime,
            localEndTime,
            startDate: today,
            isFixed,
          })
          .onConflictDoNothing();
      }
      async function habit(
        key: string,
        name: string,
        category: string,
        schedule: string,
        monthlyTarget: number,
      ) {
        const [created] = await tx
          .insert(habits)
          .values({
            userId,
            templateKey: key,
            name,
            category,
            schedule,
            monthlyTarget,
            startDate: today,
          })
          .onConflictDoNothing()
          .returning({ id: habits.id });
        if (created)
          await tx.insert(habitScheduleRevisions).values({
            userId,
            habitId: created.id,
            effectiveDate: today,
            schedule,
            startDate: today,
            status: 'active',
          });
      }
      if (input.sections.includes('university')) {
        await goal('university', 'University', 'Build strong results in five subjects');
        for (let slot = 1; slot <= 5; slot++)
          await tx.insert(subjects).values({ userId, slot }).onConflictDoNothing();
        await block(
          'lecture-mon',
          'University lectures',
          'University',
          '1000000',
          input.mondayStart,
          input.mondayEnd,
          true,
        );
        await block(
          'lecture-tue',
          'University lectures',
          'University',
          '0100000',
          input.tuesdayStart,
          input.tuesdayEnd,
          true,
        );
        await block(
          'study-wed-fri',
          'Focused subject study',
          'University',
          '0011100',
          '09:00',
          '11:00',
        );
        await block(
          'academic-sat',
          'Academic consolidation',
          'University',
          '0000010',
          '09:00',
          '11:00',
        );
        await block('recall-mon-tue', 'Lecture recall', 'University', '1100000', '20:00', '20:30');
        await block(
          'weakness-sun',
          'Review weak subjects',
          'University',
          '0000001',
          '10:00',
          '11:00',
        );
      }
      if (input.sections.includes('industry')) {
        const id = await goal('industry', 'Industry Project', 'Deliver the UCSC Industry Project');
        await project('industry-project', 'UCSC Industry Project', 'UCSC Industry Project', id);
        await block(
          'industry-wed-fri',
          'Industry Project work',
          'Industry Project',
          '0010100',
          '14:00',
          '16:00',
        );
      }
      if (input.sections.includes('career')) {
        await goal('shared-core', 'Career', 'Practice shared SE and DevOps foundations');
        const se = await goal(
          'se-portfolio',
          'Career',
          'Build a Software Engineering portfolio project',
        );
        const devops = await goal('devops-portfolio', 'Career', 'Build a DevOps portfolio project');
        await project(
          'se-project',
          'Software Engineering Portfolio',
          'Software Engineering Portfolio',
          se,
        );
        await project('devops-project', 'DevOps Portfolio', 'DevOps Portfolio', devops);
        await block(
          'shared-core-block',
          'Shared technical foundations',
          'Career',
          '0001000',
          '16:30',
          '18:00',
        );
        await block('se-practice', 'Practical coding', 'Career', '0010010', '11:30', '13:00');
        await block(
          'devops-practice',
          'Apply DevOps learning',
          'Career',
          '0001100',
          '11:30',
          '13:00',
        );
      }
      if (input.sections.includes('interview')) {
        await goal('interviews', 'Interview Preparation', 'Prepare for technical interviews');
        await block(
          'interview-practice',
          'Technical interview practice',
          'Interview Preparation',
          '0001000',
          '19:00',
          '19:45',
        );
        await block(
          'mock-interview',
          'Mock interview',
          'Interview Preparation',
          '0000001',
          '15:30',
          '16:15',
        );
      }
      if (input.sections.includes('english')) {
        await goal('communication', 'Communication', 'Speak technical English confidently');
        await habit('english-daily', 'English practice (20–30 min)', 'Communication', 'daily', 25);
        await block(
          'technical-explanation',
          'Explain a technical topic aloud',
          'Communication',
          '0000010',
          '14:00',
          '14:30',
        );
      }
      if (input.sections.includes('fitness')) {
        await goal(
          'body-weight',
          'Fitness',
          'Move from 70 kg toward 80 kg over about eight months',
          80,
          'kg',
        );
        await habit('gym-4', 'Gym session', 'Fitness', 'custom:0110110', 16);
        await block('gym-4-block', 'Gym training', 'Fitness', '0110110', '17:30', '18:45');
        await habit('weigh-in', 'Morning weight check', 'Fitness', 'custom:1010100', 12);
      }
      if (input.sections.includes('nutrition')) {
        await goal(
          'nutrition-reference',
          'Fitness',
          `Nutrition reference: approximately ${input.calories} kcal and ${input.protein} g protein daily`,
        );
      }
      if (input.sections.includes('recovery')) {
        await goal('sleep-recovery', 'Sleep & Recovery', 'Protect sleep and recovery');
        await habit('reading', 'Read 10 pages before sleep', 'Reading', 'daily', 25);
        await habit('meditation', 'Meditate for 10 minutes', 'Personal Development', 'daily', 25);
        await habit('sleep-routine', 'Sleep routine: 23:00–06:30', 'Sleep & Recovery', 'daily', 25);
        await block(
          'recovery-day',
          'Recovery and recreation',
          'Sleep & Recovery',
          '0000001',
          '13:00',
          '15:00',
        );
      }
      if (input.sections.includes('review'))
        await block(
          'weekly-review',
          'Weekly review',
          'Personal Development',
          '0000001',
          '08:30',
          '09:00',
        );
    });
  } catch {
    return { error: 'Could not apply the setup. Please review conflicts and try again.' };
  }
  for (const route of [
    '/today',
    '/week',
    '/goals',
    '/review',
    '/habits',
    '/dashboard',
    '/settings',
    '/settings/life-os',
  ])
    revalidatePath(route);
  return { success: 'Selected sections are ready. Applying again will keep your existing edits.' };
}
