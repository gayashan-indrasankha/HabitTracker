'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeeklySummary } from '@/types';

interface WeeklyBarChartProps {
  data: WeeklySummary[];
}

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  if (data.length === 0 || data.every((d) => d.total === 0)) {
    return (
      <Card className="analytics-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly fixed-habit adherence</CardTitle>
        </CardHeader>
        <CardContent className="flex h-44 items-center justify-center">
          <p className="text-sm text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="analytics-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Weekly fixed-habit adherence</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
