'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setMealStatusAction } from '@/lib/actions/nutrition-actions';
import type { MealStatus } from '@/lib/nutrition/summary';

type Meal = {
  id: string;
  name: string;
  notes: string | null;
  preferredTime: string | null;
  plannedCalories: number | null;
  plannedProtein: number | null;
};

export function MealChecklist({
  date,
  today,
  meals,
  initialStatuses,
  summary,
}: {
  date: string;
  today: string;
  meals: Meal[];
  initialStatuses: Record<string, MealStatus>;
  summary: {
    recordedDays: number;
    followedItems: number;
    notFollowedItems: number;
    unrecordedDays: number;
  };
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState(initialStatuses);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function record(id: string, status: MealStatus | 'not_recorded') {
    setPendingId(id);
    setError('');
    startTransition(async () => {
      try {
        const result = await setMealStatusAction(id, date, status);
        if (result.error) {
          setError(result.error);
          return;
        }
        setStatuses((current) => {
          const next = { ...current };
          if (status === 'not_recorded') delete next[id];
          else next[id] = status;
          return next;
        });
        router.refresh();
      } catch {
        setError('Could not save this meal. Try again.');
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <details className="rounded-2xl border bg-card p-4">
      <summary className="cursor-pointer font-semibold">
        Nutrition checklist{' '}
        <span className="text-xs font-normal text-muted-foreground">(optional)</span>
      </summary>
      <div className="mt-3 space-y-3">
        <form action="/today" className="flex flex-wrap items-end gap-2 text-sm">
          <label>
            Log date{' '}
            <input
              className="ml-2 min-h-10 rounded-lg border bg-background px-2"
              type="date"
              name="mealDate"
              max={today}
              defaultValue={date}
            />
          </label>
          <button className="min-h-10 rounded-lg border px-3" type="submit">
            View date
          </button>
        </form>
        {meals.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add meals in Settings to start this optional checklist.
          </p>
        )}
        {meals.map((meal) => (
          <div key={meal.id} className="rounded-xl border p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <strong>{meal.name}</strong>
              <span className="text-xs text-muted-foreground">
                {meal.preferredTime ?? 'Any time'}
              </span>
            </div>
            {meal.notes && (
              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                {meal.notes}
              </p>
            )}
            {(meal.plannedCalories != null || meal.plannedProtein != null) && (
              <p className="mt-1 text-xs text-muted-foreground">
                Plan reference:{' '}
                {meal.plannedCalories == null ? '' : `~${meal.plannedCalories} kcal`}
                {meal.plannedCalories != null && meal.plannedProtein != null ? ' · ' : ''}
                {meal.plannedProtein == null ? '' : `~${meal.plannedProtein} g protein`}. Actual
                intake is not calculated.
              </p>
            )}
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="group"
              aria-label={`${meal.name} status on ${date}`}
            >
              {(['followed', 'not_followed', 'not_recorded'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={pending && pendingId === meal.id}
                  aria-pressed={(statuses[meal.id] ?? 'not_recorded') === status}
                  onClick={() => record(meal.id, status)}
                  className={`min-h-10 rounded-lg border px-3 text-xs ${(statuses[meal.id] ?? 'not_recorded') === status ? 'border-primary bg-primary/10 text-primary' : 'bg-background'}`}
                >
                  {status === 'followed'
                    ? 'Followed'
                    : status === 'not_followed'
                      ? 'Not followed'
                      : 'Not recorded'}
                </button>
              ))}
            </div>
          </div>
        ))}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          This week: {summary.recordedDays} days with a record · {summary.followedItems} followed
          items · {summary.notFollowedItems} not-followed items · {summary.unrecordedDays}{' '}
          unrecorded days. A checkbox does not measure calories or protein.
        </p>
      </div>
    </details>
  );
}
