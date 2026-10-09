'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import {
  installPersonalLifeOs,
  previewPersonalLifeOs,
  type Plan,
  type SetupOptions,
} from '@/lib/life-os/install';
import { sectionLabels } from '@/lib/life-os/preset';
import type { LifeActionState } from './life-actions';

const section = z.enum(
  Object.keys(sectionLabels) as [keyof typeof sectionLabels, ...(keyof typeof sectionLabels)[]],
);
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const inputSchema = z.object({
  sections: z.array(section).min(1),
  mondayStart: clock,
  mondayEnd: clock,
  tuesdayStart: clock,
  tuesdayEnd: clock,
  calories: z.coerce.number().int().min(1000).max(6000),
  protein: z.coerce.number().int().min(20).max(400),
});

function parse(form: FormData): SetupOptions {
  const input = inputSchema.parse({
    sections: form.getAll('section'),
    mondayStart: form.get('mondayStart'),
    mondayEnd: form.get('mondayEnd'),
    tuesdayStart: form.get('tuesdayStart'),
    tuesdayEnd: form.get('tuesdayEnd'),
    calories: form.get('calories'),
    protein: form.get('protein'),
  });
  if (input.mondayEnd <= input.mondayStart || input.tuesdayEnd <= input.tuesdayStart)
    throw new Error('Lecture end time must be after its start time.');
  return {
    ...input,
    updateSchedule: form.get('updateSchedule') === 'yes',
    confirm: form.get('confirm') === 'yes',
  };
}

export async function previewLifeTemplateAction(
  form: FormData,
): Promise<{ plan?: Plan; error?: string }> {
  const userId = (await requireUser()).id;
  try {
    return { plan: await previewPersonalLifeOs(userId, parse(form)) };
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? error.issues[0]?.message
          : error instanceof Error
            ? error.message
            : 'Preview failed.',
    };
  }
}

export async function applyLifeTemplateAction(
  _: LifeActionState,
  form: FormData,
): Promise<LifeActionState> {
  const userId = (await requireUser()).id;
  try {
    const options = parse(form);
    if (!options.confirm) return { error: 'Review the preview and confirm before installing.' };
    const result = await installPersonalLifeOs(userId, options);
    for (const path of [
      '/dashboard',
      '/today',
      '/week',
      '/habits',
      '/goals',
      '/projects',
      '/review',
      '/settings',
      '/settings/life-os',
    ])
      revalidatePath(path);
    return {
      success: `Created ${result.created} items. Updated ${result.updated} future schedules. Kept ${result.existing} existing or previously removed items. ${result.conflicts} need review.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? error.issues[0]?.message
          : error instanceof Error
            ? error.message
            : 'Setup failed; no partial changes were saved.',
    };
  }
}
