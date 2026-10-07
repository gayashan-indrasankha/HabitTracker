import type { SelectHabit, SelectHabitEntry, CompletionStats } from '@/types';
import { calculateDailyProgress } from '@/lib/analytics/daily-progress';
import { calculateWeeklySummary } from '@/lib/analytics/weekly-summary';
import { calculateTopHabits } from '@/lib/analytics/top-habits';
import { CompletionDonut } from '@/components/analytics/completion-donut';
import { DailyLineChart } from '@/components/analytics/daily-line-chart';
import { WeeklyBarChart } from '@/components/analytics/weekly-bar-chart';
import { TopHabitsList } from '@/components/analytics/top-habits-list';

interface AnalyticsPanelProps {
  habits: SelectHabit[];
  entries: SelectHabitEntry[];
  daysInMonth: Date[];
  today: Date;
  stats: CompletionStats;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function AnalyticsPanel({
  habits,
  entries,
  daysInMonth,
  today,
  stats,
  weekStartsOn,
}: AnalyticsPanelProps) {
  const dailyProgress = calculateDailyProgress(habits, entries, daysInMonth, today);
  const weeklySummary = calculateWeeklySummary(
    habits,
    entries,
    daysInMonth,
    weekStartsOn,
    today,
  );
  const topHabits = calculateTopHabits(habits, entries, daysInMonth, today, 5);

  return (
    <section aria-label="Habit analytics" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CompletionDonut stats={stats} />
      <TopHabitsList topHabits={topHabits} />
      <DailyLineChart data={dailyProgress} />
      <WeeklyBarChart data={weeklySummary} />
    </section>
  );
}
