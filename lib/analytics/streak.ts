import { isScheduledWeekday } from './habit-month-progress';

export type StreakCompletion = {
  date: string;
  startDate: string;
  endDate?: string | null;
  schedule: string;
  archived: boolean;
};

/**
 * An activity streak is consecutive calendar days with at least one completed,
 * scheduled entry for an active habit. Unscheduled days without a completion
 * break the streak. Today gets a one-day grace period: when it has no completion,
 * the current streak may still end yesterday. Best streak is the longest run
 * through the cutoff, including earlier months; future entries never count.
 */
export function calculateStreaks(entries: StreakCompletion[], cutoff: string) {
  const completedDates = new Set(
    entries
      .filter((entry) => {
        if (
          entry.archived ||
          entry.date < entry.startDate ||
          (entry.endDate && entry.date > entry.endDate) ||
          entry.date > cutoff
        )
          return false;
        const [year, month, day] = entry.date.split('-').map(Number);
        const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
        return isScheduledWeekday(entry.schedule, weekday);
      })
      .map((entry) => entry.date),
  );

  const dates = [...completedDates].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of dates) {
    run = previous && previousDay(date) === previous ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }

  let cursor = completedDates.has(cutoff) ? cutoff : previousDay(cutoff);
  let current = 0;
  while (completedDates.has(cursor)) {
    current++;
    cursor = previousDay(cursor);
  }

  return { current, best };
}

function previousDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}
