import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getDaysInMonth } from '@/lib/utils/date';
import { calculateWeeklySummary } from '@/lib/analytics/weekly-summary';
import { WeeklyBarChart } from '@/components/analytics/weekly-bar-chart';
import type { SelectHabit, SelectHabitEntry } from '@/types';

const habit: SelectHabit = {
  id: 'daily-habit',
  userId: 'owner',
  name: 'Read',
  description: null,
  icon: null,
  category: null,
  monthlyTarget: 20,
  schedule: 'daily',
  templateKey: null,
  startDate: '2026-10-01',
  endDate: null,
  archived: false,
  sortOrder: 0,
  createdAt: new Date('2026-10-01'),
  updatedAt: new Date('2026-10-01'),
};

const entry = (date: string): SelectHabitEntry => ({
  id: date,
  habitId: habit.id,
  userId: habit.userId,
  date,
  completed: true,
  createdAt: new Date(date),
  updatedAt: new Date(date),
});

describe('weekly fixed-habit chart', () => {
  it('uses the same seven-day groups as the monthly tracker', () => {
    const weeks = calculateWeeklySummary(
      [habit],
      [entry('2026-10-08'), entry('2026-10-09'), entry('2026-10-20')],
      getDaysInMonth(2026, 10),
      new Date(2026, 9, 9),
    );
    expect(weeks).toHaveLength(5);
    expect(weeks.map(({ total, completed, rate }) => ({ total, completed, rate }))).toEqual([
      { total: 7, completed: 0, rate: 0 },
      { total: 2, completed: 2, rate: 100 },
      { total: 0, completed: 0, rate: null },
      { total: 0, completed: 0, rate: null },
      { total: 0, completed: 0, rate: null },
    ]);
    expect(
      calculateWeeklySummary([habit], [], getDaysInMonth(2026, 2), new Date(2026, 1, 28)),
    ).toHaveLength(4);
  });

  it('shows an explicit zero instead of an empty-looking plot', () => {
    const weeks = calculateWeeklySummary(
      [habit],
      [],
      getDaysInMonth(2026, 10),
      new Date(2026, 9, 9),
    );
    render(<WeeklyBarChart data={weeks} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(
      screen.getByText('0 of 9 eligible fixed-habit occurrences completed so far'),
    ).toBeInTheDocument();
    expect(screen.getByText('0/7 · 0%')).toBeInTheDocument();
    expect(screen.getAllByText('No eligible days')).toHaveLength(3);
  });
});
