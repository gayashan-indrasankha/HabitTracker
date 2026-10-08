'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompletionStats } from '@/types';

interface CompletionDonutProps {
  stats: CompletionStats;
}

export function CompletionDonut({ stats }: CompletionDonutProps) {
  const remaining = Math.max(0, stats.total - stats.completed);
  const remainingRate = 100 - stats.rate;
  const data = [
    { name: 'Completed', value: stats.completed },
    { name: 'Remaining', value: remaining },
  ];

  const COLORS = ['var(--primary)', 'var(--muted)'];

  if (stats.total === 0) {
    return (
      <Card className="analytics-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Completion overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <p className="text-sm text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="analytics-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Completion overview</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-[minmax(0,1fr)_minmax(76px,34%)_minmax(0,1fr)] items-center gap-1 text-center">
        <div className="min-w-0">
          <strong className="block text-base font-bold tabular-nums text-primary">
            {stats.rate}%
          </strong>
          <span className="block text-[10px] leading-tight text-muted-foreground">Completed</span>
        </div>
        <div
          role="img"
          aria-label={`${stats.rate}% completed and ${remainingRate}% remaining; ${stats.completed} of ${stats.total} fixed scheduled occurrences completed`}
          className="h-32 min-w-0"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="88%"
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value ?? 0, String(name)]}
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-0">
          <strong className="block text-base font-bold tabular-nums">{remainingRate}%</strong>
          <span className="block text-[10px] leading-tight text-muted-foreground">Remaining</span>
        </div>
      </CardContent>
    </Card>
  );
}
