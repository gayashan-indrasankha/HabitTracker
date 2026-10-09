'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { NoteUpsertSchema } from '@/lib/validations/note';
import { upsertNote } from '@/lib/dal/notes';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';

export type NoteActionState = {
  error?: string;
  success?: boolean;
};

export async function upsertNoteAction(
  _prevState: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  const userId = user.id;

  const raw = {
    date: formData.get('date'),
    content: formData.get('content'),
  };

  const parsed = NoteUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const settings = await getUserSettings(userId);
  if (parsed.data.date !== toDateString(getTodayInTimezone(settings.timezone))) {
    return { error: 'Past journal entries are read-only.' };
  }

  await upsertNote(userId, parsed.data.date, parsed.data.content);
  revalidatePath('/notes');
  revalidatePath('/dashboard');
  revalidatePath('/today');
  return { success: true };
}
