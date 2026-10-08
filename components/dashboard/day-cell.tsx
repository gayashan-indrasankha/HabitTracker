'use client';

import { memo } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DayCellProps {
  habitName: string;
  date: string;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
  isEligible: boolean;
  isPending: boolean;
  isBusy: boolean;
  onToggle: (date: string) => void;
}

export const DayCell = memo(function DayCell({ habitName, date, isCompleted, isToday, isFuture, isEligible, isPending, isBusy, onToggle }: DayCellProps) {
  const label = `${isCompleted ? 'Remove completion' : 'Mark complete'} for ${habitName} on ${date}`;
  return (
    <td className={cn('w-10 min-w-10 border-b p-1 text-center', isToday && 'bg-primary/5')}>
      {isEligible ? (
        <button type="button" aria-label={label} aria-pressed={isCompleted} title={label}
          disabled={isFuture || isBusy} onClick={() => onToggle(date)}
          className={cn('mx-auto flex h-7 w-7 items-center justify-center rounded-[5px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isCompleted ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background hover:border-primary hover:bg-primary/5',
            isFuture && 'cursor-not-allowed opacity-35', isPending && 'opacity-65')}>
          {isPending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : isCompleted ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} /> : null}
        </button>
      ) : <span aria-label="Not scheduled" className="mx-auto block text-sm font-medium text-muted-foreground/60">—</span>}
    </td>
  );
});
