import { z } from 'zod';

const HabitFieldsSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .or(z.literal('')),
  icon: z.string().max(50).optional().or(z.literal('')),
  category: z.string().max(60).optional().or(z.literal('')),
  monthlyTarget: z
    .number()
    .int('Monthly target must be a whole number')
    .min(1, 'Monthly target must be at least 1')
    .max(31, 'Monthly target cannot exceed 31'),
  schedule: z.string().refine(
    (value) => ['daily', 'weekdays', 'weekends'].includes(value) || /^weekly:[1-7]$/.test(value) || (/^custom:[01]{7}$/.test(value) && value.includes('1')),
    { message: 'Choose a valid schedule' },
  ),
  startDate: z.iso.date(),
  endDate: z.union([z.iso.date(), z.literal('')]).optional(),
});

export const HabitCreateSchema = HabitFieldsSchema.refine((value) => !value.endDate || value.endDate >= value.startDate, {
  message: 'End date must be on or after the start date', path: ['endDate'],
});

export const HabitUpdateSchema = HabitFieldsSchema.partial();

export type HabitCreateInput = z.infer<typeof HabitCreateSchema>;
export type HabitUpdateInput = z.infer<typeof HabitUpdateSchema>;
