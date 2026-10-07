'use client';

import { useTransition } from 'react';
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
import {
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { archiveHabitAction, unarchiveHabitAction } from '@/lib/actions/habit-actions';

interface HabitCardProps {
  habit: SelectHabit;
  isArchived?: boolean;
}

export function HabitCard({ habit, isArchived = false }: HabitCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(async () => {
      if (isArchived) {
        await unarchiveHabitAction(habit.id);
      } else {
        await archiveHabitAction(habit.id);
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
              <p className="truncate font-semibold">{habit.name}</p>
              {habit.category && (
                <span className="inline-block mt-0.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
                className="h-8 w-8 shrink-0"
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
                  isArchived
                    ? 'text-emerald-600 focus:text-emerald-600'
                    : 'text-muted-foreground'
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
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
            {habit.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Target: {habit.monthlyTarget} days/mo</span>
          <span className="capitalize">{habit.schedule}</span>
        </div>
      </CardContent>
    </Card>
  );
}
