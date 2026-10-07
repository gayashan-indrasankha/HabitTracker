import { HabitForm } from '@/components/habits/habit-form';
import { createHabitAction } from '@/lib/actions/habit-actions';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewHabitPage() {
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/habits" aria-label="Back to habits">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Habit</h1>
          <p className="text-sm text-muted-foreground">
            Define what you want to track
          </p>
        </div>
      </div>

      <HabitForm action={createHabitAction} defaultStartDate={today} />
    </div>
  );
}
