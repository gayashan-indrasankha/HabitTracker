'use client';

import { useState, useTransition } from 'react';
import type { SelectHabit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { archiveHabitAction, unarchiveHabitAction } from '@/lib/actions/habit-actions';

interface HabitCardProps {
  habit: SelectHabit;
  isArchived?: boolean;
}

function scheduleLabel(schedule: string) {
  if (schedule === 'daily') return 'Every day';
  if (schedule === 'weekdays') return 'Weekdays';
  if (schedule === 'weekends') return 'Weekends';
  if (schedule.startsWith('weekly:')) {
    const count = Number(schedule.slice(7));
    return `${count} ${count === 1 ? 'time' : 'times'} per week`;
  }
  if (/^custom:[01]{7}$/.test(schedule)) {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return weekdays.filter((_, index) => schedule[7 + index] === '1').join(', ');
  }
  return schedule;
}

export function HabitCard({ habit, isArchived = false }: HabitCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleArchive() {
    setError('');
    startTransition(async () => {
      try {
        const result = isArchived
          ? await unarchiveHabitAction(habit.id)
          : await archiveHabitAction(habit.id);
        if (result.error) setError(result.error);
      } catch {
        setError('Could not change this habit. Try again.');
      }
    });
  }

  return (
    <Card className="relative border-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {habit.icon && (
              <span className="text-xl shrink-0" aria-hidden>
                {habit.icon}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold" title={habit.name}>
                {habit.name}
              </p>
              {habit.category && (
                <span
                  className="mt-0.5 inline-block max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  title={habit.category}
                >
                  {habit.category}
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label={`Actions for ${habit.name}`}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/habits/${habit.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleArchive}
                className={
                  isArchived ? 'text-emerald-600 focus:text-emerald-600' : 'text-muted-foreground'
                }
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {habit.description && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{habit.description}</p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
          <span>Target: {habit.monthlyTarget} days/mo</span>
          <span>{scheduleLabel(habit.schedule)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
