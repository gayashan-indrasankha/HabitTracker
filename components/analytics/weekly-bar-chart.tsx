'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeeklySummary } from '@/types';

interface WeeklyBarChartProps {
  data: WeeklySummary[];
}

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  const eligible = data.filter((week) => week.total > 0);
  if (eligible.length === 0) {
    return (
      <Card className="analytics-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly fixed-habit adherence</CardTitle>
        </CardHeader>
        <CardContent className="flex h-44 items-center justify-center">
          <p className="text-sm text-muted-foreground">No eligible fixed-habit days yet</p>
        </CardContent>
      </Card>
    );
  }

  const completed = eligible.reduce((sum, week) => sum + week.completed, 0);
  const total = eligible.reduce((sum, week) => sum + week.total, 0);

  return (
    <Card className="analytics-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Weekly fixed-habit adherence</CardTitle>
      </CardHeader>
      <CardContent>
        {completed === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center text-center">
            <p className="text-3xl font-bold tabular-nums text-primary">0%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              0 of {total} eligible fixed-habit occurrences completed so far
            </p>
          </div>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value ?? 0}%`, 'Rate']}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="rate" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <ol
          aria-label="Weekly fixed-habit counts"
          className="mt-3 grid grid-cols-5 gap-1 text-center text-xs text-muted-foreground"
        >
          {data.map((week) => (
            <li key={week.weekLabel} className="rounded-md bg-muted/40 px-1 py-2">
              <span className="block font-semibold text-foreground">{week.weekLabel}</span>
              <span>
                {week.total > 0
                  ? `${week.completed}/${week.total} · ${week.rate}%`
                  : 'No eligible days'}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
