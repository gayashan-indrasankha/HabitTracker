'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SelectHabit } from '@/types';
import { reorderHabitsAction } from '@/lib/actions/habit-actions';
import { HabitCard } from './habit-card';

export function HabitOrder({ habits }: { habits: SelectHabit[] }) {
  const [items, setItems] = useState(habits);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();
  function move(index: number, offset: number) {
    if (pending || index + offset < 0 || index + offset >= items.length) return;
    const previous = items;
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setItems(next);
    setError('');
    start(async () => {
      try {
        const result = await reorderHabitsAction(next.map((item) => item.id));
        if (result.error) throw new Error(result.error);
        router.refresh();
      } catch {
        setItems(previous);
        setError('Could not save the new order. Try again.');
      }
    });
  }
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Use Move up or Move down to set the habit order.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((habit, index) => (
          <li key={habit.id} className="space-y-2">
            <HabitCard habit={habit} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={pending || index === 0}
                aria-label={`Move ${habit.name} up`}
                className="min-h-10 rounded-lg border px-3 text-sm disabled:opacity-40"
              >
                Move up
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={pending || index === items.length - 1}
                aria-label={`Move ${habit.name} down`}
                className="min-h-10 rounded-lg border px-3 text-sm disabled:opacity-40"
              >
                Move down
              </button>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
