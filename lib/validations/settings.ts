import { z } from 'zod';

export const UserSettingsSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required').max(60).refine((value) => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; }
    catch { return false; }
  }, 'Choose a valid IANA timezone'),
  weekStartsOn: z
    .number()
    .int()
    .min(0, 'Week starts on must be 0 (Sun) to 6 (Sat)')
    .max(6),
  theme: z.enum(['light', 'dark', 'system']),
});

export type UserSettingsInput = z.infer<typeof UserSettingsSchema>;
