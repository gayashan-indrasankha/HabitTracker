import { z } from 'zod';

export const ToggleEntrySchema = z.object({
  habitId: z.string().uuid('Invalid habit ID'),
  date: z.iso.date(),
  completed: z.boolean(),
});

export type ToggleEntryInput = z.infer<typeof ToggleEntrySchema>;
