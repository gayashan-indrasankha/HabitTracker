'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { DayCell } from './day-cell';
import { HabitNameTooltip } from './habit-name-tooltip';
import { toggleEntryAction } from '@/lib/actions/entry-actions';
import {
  habitMonthProgress,
  habitRuleOn,
  isGridApplicable,
  isFlexibleWeekly,
  weeklyQuotaAttainment,
  type CalendarDay,
} from '@/lib/analytics/habit-month-progress';
import type { SelectHabit } from '@/types';

interface HabitRowProps {
  habit: SelectHabit;
  days: CalendarDay[];
  today: string;
  weekStartsOn: number;
  initialCompletedDates: string[];
}

export function HabitRow({
  habit,
  days,
  today,
  weekStartsOn,
  initialCompletedDates,
}: HabitRowProps) {
  const [completedDates, setCompletedDates] = useState(() => new Set(initialCompletedDates));
  const completedRef = useRef(completedDates);
  const pendingRef = useRef(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progress = useMemo(
    () => habitMonthProgress(habit, days, completedDates, today),
    [habit, days, completedDates, today],
  );
  const displayedCutoff = today < days.at(-1)!.date ? today : days.at(-1)!.date;
  const displayedRule = habitRuleOn(habit, displayedCutoff);
  const flexible = displayedRule ? isFlexibleWeekly(displayedRule.schedule) : false;
  const weekly = flexible
    ? weeklyQuotaAttainment(habit, displayedCutoff, completedDates, displayedCutoff, weekStartsOn)
    : null;
  const displayedProgress = weekly
    ? {
        completed: weekly.completed,
        goal: weekly.goal,
        percentage: weekly.goal
          ? Math.min(100, Math.round((weekly.completed / weekly.goal) * 100))
          : 0,
      }
    : progress;

  const handleToggle = useCallback(
    async (date: string) => {
      if (pendingRef.current || date !== today) return;
      pendingRef.current = true;
      setPendingDate(date);
      setError(null);
      const wasCompleted = completedRef.current.has(date);
      const next = new Set(completedRef.current);
      if (wasCompleted) next.delete(date);
      else next.add(date);
      completedRef.current = next;
      setCompletedDates(next);

      const formData = new FormData();
      formData.set('habitId', habit.id);
      formData.set('date', date);
      formData.set('completed', String(!wasCompleted));
      try {
        const result = await toggleEntryAction({}, formData);
        if (result.error) throw new Error(result.error);
      } catch (failure) {
        const rollback = new Set(completedRef.current);
        if (wasCompleted) rollback.add(date);
        else rollback.delete(date);
        completedRef.current = rollback;
        setCompletedDates(rollback);
        setError(
          failure instanceof Error ? failure.message : 'Could not save this day. Try again.',
        );
      } finally {
        pendingRef.current = false;
        setPendingDate(null);
      }
    },
    [habit.id, today],
  );

  return (
    <tr className="group hover:bg-primary/[0.025]">
      <th
        scope="row"
        className="sticky left-0 z-10 w-48 min-w-48 max-w-48 border-b bg-card px-4 py-3 text-left group-hover:bg-[#f7faff] dark:group-hover:bg-muted"
      >
        <HabitNameTooltip
          name={habit.name}
          icon={habit.icon}
          description={habit.description}
          archived={habit.archived}
        />
        {error && (
          <span role="alert" className="mt-1 block text-xs font-normal text-destructive">
            {error}
          </span>
        )}
      </th>
      <td className="w-20 min-w-20 border-b px-2 py-3 text-center font-semibold tabular-nums">
        {flexible ? `${displayedRule?.schedule.split(':')[1]}/week` : progress.goal}
      </td>
      <td className="w-28 min-w-28 border-b px-2 py-3">
        <div className="flex items-baseline justify-between gap-1 tabular-nums">
          <span className="font-semibold">
            {displayedProgress.completed} / {displayedProgress.goal}
          </span>
          <span className="text-xs text-muted-foreground">{displayedProgress.percentage}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${displayedProgress.percentage}%` }}
          />
        </div>
      </td>
      {days.map((day) => {
        const isEligible = isGridApplicable(habit, day, days, completedDates);
        return (
          <DayCell
            key={day.date}
            habitName={habit.name}
            date={day.date}
            isCompleted={completedDates.has(day.date)}
            isToday={day.date === today}
            isPast={day.date < today}
            isFuture={day.date > today}
            isEligible={isEligible}
            isReadOnly={habit.archived || !isEligible}
            isPending={pendingDate === day.date}
            isBusy={pendingDate !== null}
            onToggle={handleToggle}
          />
        );
      })}
    </tr>
  );
}
