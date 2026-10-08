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

export function isFlexibleWeekly(schedule: string): boolean {
  return /^weekly:[1-7]$/.test(schedule);
}

export function isFixedOccurrence(habit: { schedule: string; startDate: string; endDate?: string | null }, date: string, dayOfWeek: number): boolean {
  return !isFlexibleWeekly(habit.schedule) && inHabitRange(habit, date) && isScheduledWeekday(habit.schedule, dayOfWeek);
}

export function weeklyQuotaAttainment(
  habit: { schedule: string; startDate: string; endDate?: string | null },
  firstDay: string,
  completedDates: ReadonlySet<string>,
  cutoff: string,
  startsOn = 1,
) {
  const quota = Number(habit.schedule.split(':')[1]);
  if (!isFlexibleWeekly(habit.schedule)) return { goal: 0, completed: 0, achieved: false };
  const start = weekStart(firstDay, startsOn);
  const [y, m, d] = start.split('-').map(Number);
  const eligible = Array.from({ length: 7 }, (_, offset) =>
    new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10))
    .filter(date => inHabitRange(habit, date));
  const goal = Math.min(quota, eligible.length);
  const completed = eligible.filter(date => date <= cutoff && completedDates.has(date)).length;
  return { goal, completed, achieved: goal > 0 && completed >= goal };
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
  // Month percentages are defined only for fixed occurrences. A calendar month
  // cuts flexible weeks in half, so weekly quota attainment is shown separately.
  void startsOn;
  const eligible = days.filter(day => day.date <= cutoff && isFixedOccurrence(habit, day.date, day.dayOfWeek));
  return { total: eligible.length, completed: eligible.filter(day => completedDates.has(day.date)).length };
}

export function isGridApplicable(habit: { schedule: string; startDate: string; endDate?: string | null }, day: CalendarDay, days: readonly CalendarDay[], completedDates: ReadonlySet<string>, startsOn = 1): boolean {
  void days; void completedDates; void startsOn;
  return inHabitRange(habit, day.date) && isScheduledWeekday(habit.schedule, day.dayOfWeek);
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
