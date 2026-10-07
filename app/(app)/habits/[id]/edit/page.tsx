import { requireUser } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { getHabitByIdAndUser } from '@/lib/dal/habits';
import { updateHabitAction } from '@/lib/actions/habit-actions';
import { HabitForm } from '@/components/habits/habit-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface EditHabitPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditHabitPage({ params }: EditHabitPageProps) {
  const user = await requireUser();

  const { id } = await params;
  const habit = await getHabitByIdAndUser(id, user.id);
  if (!habit) notFound();

  // Bind the habit ID into the action
  const boundAction = updateHabitAction.bind(null, habit.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/habits" aria-label="Back to habits">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Habit</h1>
          <p className="text-sm text-muted-foreground">Update habit details</p>
        </div>
      </div>

      <HabitForm
        action={boundAction}
        defaultValues={{
          name: habit.name,
          description: habit.description ?? '',
          icon: habit.icon ?? '',
          category: habit.category ?? '',
          monthlyTarget: habit.monthlyTarget,
          schedule: habit.schedule,
          startDate: habit.startDate,
          endDate: habit.endDate ?? '',
        }}
        defaultStartDate={habit.startDate}
      />
    </div>
  );
}
