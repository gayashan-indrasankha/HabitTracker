import type { SelectHabit, SelectHabitEntry, WeeklySummary } from '@/types';
import { isFixedOccurrence, weekStart } from './habit-month-progress';
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

/** Eight calendar weeks, oldest to newest, including the week containing cutoff. */
export function calculateEightWeekSummary(
  habits: SelectHabit[],
  entries: SelectHabitEntry[],
  cutoff: string,
  weekStartsOn = 1,
): WeeklySummary[] {
  const entrySet = new Set(
    entries.filter((entry) => entry.completed).map((entry) => `${entry.habitId}:${entry.date}`),
  );
  const currentWeekStart = weekStart(cutoff, weekStartsOn);
  const [year, month, day] = currentWeekStart.split('-').map(Number);
  const currentWeekStartUtc = Date.UTC(year, month - 1, day);
  const dayMs = 24 * 60 * 60 * 1000;

  return Array.from({ length: 8 }, (_, weekIndex) => {
    const firstDayUtc = currentWeekStartUtc - (7 - weekIndex) * 7 * dayMs;
    const firstDay = new Date(firstDayUtc);
    let completed = 0;
    let total = 0;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(firstDayUtc + dayIndex * dayMs);
      const dateStr = date.toISOString().slice(0, 10);
      if (dateStr > cutoff) continue;

      for (const habit of habits) {
        if (!isFixedOccurrence(habit, dateStr, date.getUTCDay())) continue;
        total++;
        if (entrySet.has(`${habit.id}:${dateStr}`)) completed++;
      }
    }

    return {
      weekLabel: format(
        new Date(firstDay.getUTCFullYear(), firstDay.getUTCMonth(), firstDay.getUTCDate()),
        'MMM d',
      ),
      rate: total === 0 ? null : Math.round((completed / total) * 100),
      completed,
      total,
    };
  });
}
