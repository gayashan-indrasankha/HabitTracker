import type { SelectHabit, SelectHabitEntry, DailyProgress } from '@/types';
import { isScheduledDay } from './completion';
import { format } from 'date-fns';

/**
 * Calculate per-day completion counts across all habits for a month.
 */
export function calculateDailyProgress(
  habits: SelectHabit[],
  entries: SelectHabitEntry[],
  daysInMonth: Date[],
  today: Date,
): DailyProgress[] {
  const todayStr = format(today, 'yyyy-MM-dd');

  const entrySet = new Set(
    entries.filter((e) => e.completed).map((e) => `${e.habitId}:${e.date}`),
  );

  return daysInMonth.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    let total = 0;
    let count = 0;

    if (dayStr <= todayStr) {
      for (const habit of habits) {
        if (habit.startDate > dayStr) continue;
        if (!isScheduledDay(habit.schedule, day)) continue;
        total++;
        if (entrySet.has(`${habit.id}:${dayStr}`)) count++;
      }
    }

    return {
      date: dayStr,
      count,
      total,
      rate: total === 0 ? null : Math.round((count / total) * 100),
    };
  });
}
