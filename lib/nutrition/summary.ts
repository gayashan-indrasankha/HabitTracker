import { addCalendarDays } from '@/lib/planning/time-blocks';

export type MealStatus = 'followed' | 'not_followed';
export type MealLog = { date: string; status: MealStatus };

/** Absence is unrecorded, never a skipped meal or an intake estimate. */
export function mealWeekSummary(logs: MealLog[], start: string, today: string) {
  const days = Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index)).filter(
    (date) => date <= today,
  );
  const inWeek = logs.filter((item) => days.includes(item.date));
  const recordedDays = new Set(inWeek.map((item) => item.date)).size;
  return {
    recordedDays,
    followedItems: inWeek.filter((item) => item.status === 'followed').length,
    notFollowedItems: inWeek.filter((item) => item.status === 'not_followed').length,
    unrecordedDays: days.length - recordedDays,
  };
}
