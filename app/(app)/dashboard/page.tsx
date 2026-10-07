import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/session';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getActiveHabitsByUser } from '@/lib/dal/habits';
import {
  getEntriesByUserAndMonth,
  getActiveHabitCompletionsThrough,
} from '@/lib/dal/habit-entries';
import { MonthNavigator } from '@/components/layout/month-navigator';
import { ProgressSummary } from '@/components/dashboard/progress-summary';
import { HabitGrid } from '@/components/dashboard/habit-grid';
import { AnalyticsPanel } from '@/components/dashboard/analytics-panel';
import { GridSkeleton } from '@/components/shared/loading-skeleton';
import {
  getDaysInMonth,
  getTodayInTimezone,
  currentYearMonth,
  parseYearMonth,
  toDateString,
  isValidYearMonth,
} from '@/lib/utils/date';
import { calculateCompletionRate } from '@/lib/analytics/completion';
import { calculateStreaks } from '@/lib/analytics/streak';
import { format } from 'date-fns';

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const userId = (await requireUser()).id;
  const settings = await getUserSettings(userId);

  const params = await searchParams;
  const today = getTodayInTimezone(settings.timezone);
  const selectedMonth = params.month && isValidYearMonth(params.month) ? params.month : currentYearMonth(settings.timezone);

  const { year, month } = parseYearMonth(selectedMonth);
  const daysInMonth = getDaysInMonth(year, month);
  const calendarDays = daysInMonth.map((day) => ({
    date: toDateString(day),
    day: day.getDate(),
    weekday: format(day, 'EEE'),
    dayOfWeek: day.getDay(),
  }));

  // Fetch habits + month entries in parallel
  const [habits, entries] = await Promise.all([
    getActiveHabitsByUser(userId),
    getEntriesByUserAndMonth(userId, year, month),
  ]);

  const todayStr = toDateString(today);
  const monthEnd = calendarDays.at(-1)?.date ?? todayStr;
  const streakCutoff = monthEnd < todayStr ? monthEnd : todayStr;
  const streakEntries = await getActiveHabitCompletionsThrough(userId, streakCutoff);

  const stats = calculateCompletionRate(habits, entries, daysInMonth, today);
  const streaks = calculateStreaks(streakEntries, streakCutoff);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track your habits for the month
          </p>
        </div>
        <Suspense fallback={null}>
          <MonthNavigator
            currentMonth={selectedMonth}
            timezone={settings.timezone}
          />
        </Suspense>
      </div>

      {/* Progress summary cards */}
      <ProgressSummary
        stats={stats}
        currentStreak={streaks.current}
        bestStreak={streaks.best}
        habitCount={habits.length}
        streakCutoff={streakCutoff}
      />

      <div className="space-y-6">
        <Suspense fallback={<GridSkeleton />}>
          <HabitGrid
            habits={habits}
            entries={entries}
            days={calendarDays}
            today={toDateString(today)}
          />
        </Suspense>

        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-muted" />
          }
        >
          <AnalyticsPanel
            habits={habits}
            entries={entries}
            daysInMonth={daysInMonth}
            today={today}
            stats={stats}
            weekStartsOn={
              settings.weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6
            }
          />
        </Suspense>
      </div>
    </div>
  );
}
