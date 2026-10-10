import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getDaysInMonth } from '@/lib/utils/date';
import { calculateEightWeekSummary, calculateWeeklySummary } from '@/lib/analytics/weekly-summary';
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

describe('weekly scheduled habit chart', () => {
  it('retains the month tracker grouping for month summaries', () => {
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
  });

  it('includes eight calendar weeks across month boundaries and excludes future days', () => {
    const weeks = calculateEightWeekSummary(
      [habit],
      [entry('2026-10-08'), entry('2026-10-10')],
      '2026-10-09',
    );
    expect(weeks).toHaveLength(8);
    expect(weeks[0].weekLabel).toBe('Aug 17');
    expect(weeks[6]).toMatchObject({ weekLabel: 'Sep 28', completed: 0, total: 4, rate: 0 });
    expect(weeks[7]).toMatchObject({ weekLabel: 'Oct 5', completed: 1, total: 5, rate: 20 });
  });

  it('uses the selected first day of the week', () => {
    const weeks = calculateEightWeekSummary([habit], [], '2026-10-09', 0);
    expect(weeks[7]).toMatchObject({ weekLabel: 'Oct 4', total: 6 });
  });

  it('shows the bar chart without the date summary cards', () => {
    const weeks = calculateEightWeekSummary([habit], [entry('2026-10-08')], '2026-10-09');
    render(<WeeklyBarChart data={weeks} />);
    expect(
      screen.getByRole('img', { name: 'Scheduled habit check-in rate for the last eight weeks' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Weekly scheduled habit counts' }),
    ).not.toBeInTheDocument();
  });
});
