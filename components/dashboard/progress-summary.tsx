import { TrendingUp, Flame, Trophy, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { CompletionStats } from '@/types';

interface ProgressSummaryProps {
  stats: CompletionStats;
  currentStreak: number;
  bestStreak: number;
  habitCount: number;
  streakCutoff: string;
}

export function ProgressSummary({
  stats,
  currentStreak,
  bestStreak,
  habitCount,
  streakCutoff,
}: ProgressSummaryProps) {
  const cards = [
    {
      icon: TrendingUp,
      label: 'Overall Progress',
      value: `${stats.rate}%`,
      sub: `${stats.completed} of ${stats.total}`,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: Flame,
      label: 'Current Streak',
      value: `${currentStreak}`,
      sub: `${currentStreak === 1 ? 'day' : 'days'} through ${streakCutoff}`,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      icon: Trophy,
      label: 'Best Streak',
      value: `${bestStreak}`,
      sub: `${bestStreak === 1 ? 'day' : 'days'} through ${streakCutoff}`,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Activity,
      label: 'Active Habits',
      value: `${habitCount}`,
      sub: habitCount === 1 ? 'habit' : 'habits',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="shadow-sm">
          <CardContent className="flex items-start gap-3 p-4">
            <div className={`rounded-lg p-2 ${card.bg}`} aria-hidden>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-xl font-bold leading-tight">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
              {card.label === 'Overall Progress' && (
                <div role="progressbar" aria-label="Overall Progress" aria-valuenow={stats.rate} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${stats.rate}%` }} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
