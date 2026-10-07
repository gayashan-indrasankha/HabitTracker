import { z } from 'zod';

export const NoteUpsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  content: z.string().min(1, 'Note content cannot be empty').max(10000),
});

export type NoteUpsertInput = z.infer<typeof NoteUpsertSchema>;
