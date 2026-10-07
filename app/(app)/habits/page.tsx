import { requireUser } from '@/lib/auth/session';
import { getAllHabitsByUser } from '@/lib/dal/habits';
import { HabitCard } from '@/components/habits/habit-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Archive } from 'lucide-react';

export default async function HabitsPage() {
  const user = await requireUser();
  const allHabits = await getAllHabitsByUser(user.id);
  const active = allHabits.filter((h) => !h.archived);
  const archived = allHabits.filter((h) => h.archived);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          <p className="text-sm text-muted-foreground">
            Manage your habit tracking list
          </p>
        </div>
        <Button asChild>
          <Link href="/habits/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Habit
          </Link>
        </Button>
      </div>

      {/* Active habits */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4">
            <PlusCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No habits yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first habit to start building better routines.
          </p>
          <Button asChild className="mt-4">
            <Link href="/habits/new">Create Habit</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </div>
      )}

      {/* Archived habits */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Archived ({archived.length})
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
            {archived.map((habit) => (
              <HabitCard key={habit.id} habit={habit} isArchived />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
