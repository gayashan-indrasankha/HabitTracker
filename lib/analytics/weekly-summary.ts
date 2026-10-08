import type { SelectHabit, SelectHabitEntry, WeeklySummary } from '@/types';
import { isFixedOccurrence } from './habit-month-progress';
import { endOfWeek, eachWeekOfInterval, eachDayOfInterval, format } from 'date-fns';

/**
 * Break a month into weeks and calculate completion rate per week.
 */
export function calculateWeeklySummary(
  habits: SelectHabit[],
  entries: SelectHabitEntry[],
  daysInMonth: Date[],
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  today: Date,
): WeeklySummary[] {
  if (daysInMonth.length === 0) return [];

  const monthStart = daysInMonth[0];
  const monthEnd = daysInMonth[daysInMonth.length - 1];

  const weekStarts = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn },
  );

  const entrySet = new Set(
    entries.filter((e) => e.completed).map((e) => `${e.habitId}:${e.date}`),
  );

  const todayStr = format(today, 'yyyy-MM-dd');

  return weekStarts.map((weekStart, idx) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
      (d) => d >= monthStart && d <= monthEnd,
    );

    let total = 0;
    let completed = 0;

    for (const habit of habits) {
      for (const day of daysInWeek) {
        const dayStr = format(day, 'yyyy-MM-dd');
        if (dayStr > todayStr) continue;
        if (habit.archived || !isFixedOccurrence(habit, dayStr, day.getDay())) continue;
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
