import type { SelectHabit, SelectHabitEntry, WeeklySummary } from '@/types';
import { isFixedOccurrence } from './habit-month-progress';
import { format } from 'date-fns';

/**
 * Match the tracker columns: days 1-7, 8-14, 15-21, 22-28, then the remainder.
 */
export function calculateWeeklySummary(
  habits: SelectHabit[],
  entries: SelectHabitEntry[],
  daysInMonth: Date[],
  today: Date,
): WeeklySummary[] {
  if (daysInMonth.length === 0) return [];

  const entrySet = new Set(entries.filter((e) => e.completed).map((e) => `${e.habitId}:${e.date}`));
  const todayStr = format(today, 'yyyy-MM-dd');

  const weeks: Date[][] = [];
  for (let index = 0; index < daysInMonth.length; index += 7)
    weeks.push(daysInMonth.slice(index, index + 7));

  return weeks.map((daysInWeek, idx) => {
    let total = 0;
    let completed = 0;

    for (const habit of habits) {
      for (const day of daysInWeek) {
        const dayStr = format(day, 'yyyy-MM-dd');
        if (dayStr > todayStr) continue;
        if (!isFixedOccurrence(habit, dayStr, day.getDay())) continue;
        total++;
        if (entrySet.has(`${habit.id}:${dayStr}`)) completed++;
      }
    }

    return {
      weekLabel: `W${idx + 1}`,
      rate: total === 0 ? null : Math.round((completed / total) * 100),
      completed,
      total,
    };
  });
}
