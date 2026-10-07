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
}

export function HabitGrid({ habits, entries, days, today }: HabitGridProps) {
  if (habits.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center shadow-sm">
        <PlusCircle aria-hidden="true" className="mx-auto mb-4 h-9 w-9 text-primary" />
        <h2 className="text-lg font-semibold">Your tracker starts here</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Create a habit to see its month at a glance.</p>
        <Button asChild className="mt-5"><Link href="/habits/new">Create a habit</Link></Button>
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

  return (
    <section aria-label="Monthly habit tracker" className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
        <div>
          <h2 className="font-semibold tracking-tight">Monthly tracker</h2>
          <p className="text-xs text-muted-foreground">Select a day to mark it complete. Scroll horizontally to see the whole month.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{habits.length} {habits.length === 1 ? 'habit' : 'habits'}</span>
      </div>
      <div className="overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Scroll monthly habit tracker horizontally">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Habits, monthly goals, progress, and daily completion for the selected month</caption>
          <thead>
            <tr className="bg-muted/45 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="sticky left-0 z-20 w-48 min-w-48 border-b bg-muted px-4 py-3 text-left">Habit</th>
              <th scope="col" className="w-20 min-w-20 border-b px-2 py-3 text-center">Goal</th>
              <th scope="col" className="w-28 min-w-28 border-b px-2 py-3 text-left">Progress</th>
              {days.map((day) => (
                <th scope="col" key={day.date} title={day.date} className={`w-10 min-w-10 border-b px-0 py-2 text-center normal-case tracking-normal ${day.date === today ? 'bg-primary/10 text-primary' : day.dayOfWeek === 0 || day.dayOfWeek === 6 ? 'bg-muted/40' : ''}`}>
                  <span className="block text-[10px] font-medium">{day.weekday}</span>
                  <span className="block text-xs font-semibold">{day.day}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => (
              <HabitRow key={`${habit.id}:${days[0]?.date}`} habit={habit} days={days} today={today} initialCompletedDates={completedByHabit.get(habit.id) ?? []} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
