import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HabitRow } from './habit-row';
import type { CalendarDay } from '@/lib/analytics/habit-month-progress';
import type { SelectHabit, SelectHabitEntry } from '@/types';

interface HabitGridProps {
  habits: SelectHabit[];
  entries: SelectHabitEntry[];
  days: CalendarDay[];
  today: string;
  weekStartsOn?: number;
}

export function HabitGrid({ habits, entries, days, today, weekStartsOn = 1 }: HabitGridProps) {
  if (habits.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center shadow-sm">
        <PlusCircle aria-hidden="true" className="mx-auto mb-4 h-9 w-9 text-primary" />
        <h2 className="text-lg font-semibold">Your tracker starts here</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Create a habit to see its month at a glance.
        </p>
        <Button asChild className="mt-5">
          <Link href="/habits/new">Create a habit</Link>
        </Button>
      </section>
    );
  }

  const completedByHabit = new Map<string, string[]>();
  for (const entry of entries) {
    if (!entry.completed) continue;
    const dates = completedByHabit.get(entry.habitId) ?? [];
    dates.push(entry.date);
    completedByHabit.set(entry.habitId, dates);
  }

  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return (
    <section
      aria-label="Monthly tracker"
      className="overflow-hidden rounded-2xl border bg-card shadow-[0_10px_35px_rgba(25,48,100,.08)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
        <div>
          <h2 className="font-bold tracking-tight">Monthly habits</h2>
          <p className="text-xs text-muted-foreground">
            Select a day to mark it complete. Scroll horizontally to see the whole month.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {habits.length} {habits.length === 1 ? 'habit' : 'habits'}
        </span>
      </div>
      <div
        className="overflow-x-auto overscroll-x-contain"
        tabIndex={0}
        aria-label="Scroll monthly tracker horizontally"
      >
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            Habits, monthly goals, progress, and daily completion for the selected month
          </caption>
          <thead>
            <tr className="bg-primary text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
              <th
                scope="col"
                rowSpan={2}
                className="sticky left-0 z-20 w-48 min-w-48 border-r border-white/20 bg-primary px-4 py-3 text-left"
              >
                Habit
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="w-20 min-w-20 border-r border-white/20 px-2 py-3 text-center"
              >
                Goal
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="w-28 min-w-28 border-r border-white/20 px-2 py-3 text-left"
              >
                Progress
              </th>
              {weeks.map((week, index) => (
                <th
                  scope="colgroup"
                  key={week[0]?.date}
                  colSpan={week.length}
                  className="whitespace-nowrap border-r border-white/20 px-1 py-2 text-center"
                >
                  Week {index + 1}
                </th>
              ))}
            </tr>
            <tr className="bg-[#f5f7fc] text-xs font-semibold text-[#2e3b58] dark:bg-muted dark:text-foreground">
              {days.map((day) => (
                <th
                  scope="col"
                  key={day.date}
                  title={day.date}
                  className={`w-10 min-w-10 border-b border-r px-0 py-2 text-center ${day.date === today ? 'bg-primary/10 text-primary' : day.dayOfWeek === 0 || day.dayOfWeek === 6 ? 'bg-slate-100 dark:bg-muted/60' : ''}`}
                >
                  <span className="block text-[10px] font-medium">{day.weekday}</span>
                  <span className="block text-xs font-bold">{day.day}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => (
              <HabitRow
                key={`${habit.id}:${days[0]?.date}`}
                habit={habit}
                days={days}
                today={today}
                weekStartsOn={weekStartsOn}
                initialCompletedDates={completedByHabit.get(habit.id) ?? []}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
