'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { NoteUpsertSchema } from '@/lib/validations/note';
import { upsertNote, deleteNote } from '@/lib/dal/notes';

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

  await upsertNote(userId, parsed.data.date, parsed.data.content);
  revalidatePath('/notes');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteNoteAction(
  _prevState: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  const userId = user.id;

  const date = formData.get('date') as string;
  if (!date) return { error: 'Date is required' };

  await deleteNote(userId, date);
  revalidatePath('/notes');
  return { success: true };
}
