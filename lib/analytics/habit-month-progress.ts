export type CalendarDay = {
  date: string;
  day: number;
  weekday: string;
  dayOfWeek: number;
};

export function isScheduledWeekday(schedule: string, dayOfWeek: number): boolean {
  if (/^weekly:[1-7]$/.test(schedule)) return true;
  if (schedule === 'daily') return true;
  if (schedule === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (schedule === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
  if (/^custom:[01]{7}$/.test(schedule)) {
    const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return schedule[7 + index] === '1';
  }
  return false;
}

export function inHabitRange(habit: { startDate: string; endDate?: string | null }, date: string): boolean {
  return date >= habit.startDate && (!habit.endDate || date <= habit.endDate);
}

export function weekStart(date: string, startsOn = 1): string {
  const [year, month, day] = date.split('-').map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));
  current.setUTCDate(current.getUTCDate() - ((current.getUTCDay() - startsOn + 7) % 7));
  return current.toISOString().slice(0, 10);
}

export function scheduleStats(
  habit: { schedule: string; startDate: string; endDate?: string | null },
  days: readonly CalendarDay[], completedDates: ReadonlySet<string>, cutoff: string,
  startsOn = 1,
) {
  const eligible = days.filter(day => day.date <= cutoff && inHabitRange(habit, day.date) && isScheduledWeekday(habit.schedule, day.dayOfWeek));
  const quota = /^weekly:([1-7])$/.exec(habit.schedule);
  if (!quota) return { total: eligible.length, completed: eligible.filter(day => completedDates.has(day.date)).length };
  const groups = new Map<string, CalendarDay[]>();
  for (const day of eligible) {
    const key = weekStart(day.date, startsOn);
    groups.set(key, [...(groups.get(key) ?? []), day]);
  }
  let total = 0;
  let completed = 0;
  for (const week of groups.values()) {
    total += Math.min(Number(quota[1]), week.length);
    completed += Math.min(Number(quota[1]), week.filter(day => completedDates.has(day.date)).length);
  }
  return { total, completed };
}

export function isGridApplicable(habit: { schedule: string; startDate: string; endDate?: string | null }, day: CalendarDay, days: readonly CalendarDay[], completedDates: ReadonlySet<string>, startsOn = 1): boolean {
  if (!inHabitRange(habit, day.date) || !isScheduledWeekday(habit.schedule, day.dayOfWeek)) return false;
  const quota = /^weekly:([1-7])$/.exec(habit.schedule);
  if (!quota || completedDates.has(day.date)) return true;
  const key = weekStart(day.date, startsOn);
  return days.filter(item => weekStart(item.date, startsOn) === key && item.date < day.date && completedDates.has(item.date)).length < Number(quota[1]);
}

export function habitMonthProgress(
  habit: { schedule: string; startDate: string; endDate?: string | null; monthlyTarget: number },
  days: CalendarDay[],
  completedDates: ReadonlySet<string>,
  today: string,
) {
  const month = scheduleStats(habit, days, completedDates, '9999-12-31');
  const elapsed = scheduleStats(habit, days, completedDates, today);
  const goal = Math.min(habit.monthlyTarget, month.total);
  const completed = Math.min(goal, elapsed.completed);
  return { completed, goal, percentage: goal ? Math.min(100, Math.round((completed / goal) * 100)) : 0 };
}
