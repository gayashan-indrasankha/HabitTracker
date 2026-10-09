import { requireUser } from '@/lib/auth/session';
import { getAllHabitsByUser } from '@/lib/dal/habits';
import { HabitCard } from '@/components/habits/habit-card';
import { HabitOrder } from '@/components/habits/habit-order';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Archive, ChevronDown } from 'lucide-react';

export const metadata = { title: 'Habits | LifeOS' };

export default async function HabitsPage() {
  const user = await requireUser();
  const allHabits = await getAllHabitsByUser(user.id);
  const active = allHabits.filter((h) => !h.archived);
  const archived = allHabits.filter((h) => h.archived);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Habits</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add and edit habits here. Check them off on the Today page.
          </p>
        </div>
        {active.length > 0 && (
          <Button asChild>
            <Link href="/habits/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add habit
            </Link>
          </Button>
        )}
      </header>

      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4">
            <Plus className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold">Start with one habit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a routine you want to repeat, then check it off on Today.
          </p>
          <Button asChild className="mt-4">
            <Link href="/habits/new">Add a habit</Link>
          </Button>
        </div>
      ) : (
        <HabitOrder
          key={active
            .map((habit) => habit.id)
            .sort()
            .join('|')}
          habits={active}
        />
      )}

      {archived.length > 0 && (
        <details className="group rounded-2xl border bg-card p-4 sm:p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
            <Archive className="h-4 w-4" aria-hidden="true" />
            Archived habits ({archived.length})
            <ChevronDown
              className="ml-auto h-4 w-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="mt-4 space-y-2">
            {archived.map((habit) => (
              <HabitCard key={habit.id} habit={habit} isArchived />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
