import type { SelectHabit, SelectHabitEntry, TopHabit } from '@/types';
import { isScheduledDay } from './completion';
import { format } from 'date-fns';

/**
 * Rank habits by their completion rate in the given month,
 * returning the top N habits.
 */
export function calculateTopHabits(
  habits: SelectHabit[],
  entries: SelectHabitEntry[],
  daysInMonth: Date[],
  today: Date,
  limit = 5,
): TopHabit[] {
  if (habits.length === 0) return [];

  const todayStr = format(today, 'yyyy-MM-dd');
  const entrySet = new Set(entries.filter((entry) => entry.completed).map((entry) => `${entry.habitId}:${entry.date}`));

  return habits
    .map((habit) => {
      let total = 0;
      let completed = 0;

      for (const day of daysInMonth) {
        const dayStr = format(day, 'yyyy-MM-dd');
        if (dayStr > todayStr) continue;
        if (habit.startDate > dayStr) continue;
        if (!isScheduledDay(habit.schedule, day)) continue;
        total++;
        if (entrySet.has(`${habit.id}:${dayStr}`)) completed++;
      }

      return {
        habit,
        rate: total === 0 ? 0 : Math.round((completed / total) * 100),
        completed,
        total,
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.rate - a.rate || b.completed - a.completed || a.habit.name.localeCompare(b.habit.name) || a.habit.id.localeCompare(b.habit.id))
    .slice(0, limit);
}
