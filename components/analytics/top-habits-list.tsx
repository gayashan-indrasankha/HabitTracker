import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';
import type { TopHabit } from '@/types';

interface TopHabitsListProps {
  topHabits: TopHabit[];
}

export function TopHabitsList({ topHabits }: TopHabitsListProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <Award className="h-4 w-4 text-amber-500" aria-hidden />
          Top Habits
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topHabits.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No data yet
          </p>
        ) : (
          <ol className="space-y-3">
            {topHabits.map((item, index) => (
              <li key={item.habit.id} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-xs font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="truncate text-xs font-medium">
                      {item.habit.name}
                    </span>
                    <span className="ml-2 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {item.rate}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={item.rate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.habit.name} completion rate`}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
