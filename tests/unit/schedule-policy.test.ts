import { describe, expect, it } from 'vitest';
import {
  isFixedOccurrence,
  isGridApplicable,
  scheduleStats,
  weeklyQuotaAttainment,
  weekStart,
} from '@/lib/analytics/habit-month-progress';
import { UserSettingsSchema } from '@/lib/validations/settings';
import { toDateString, toZonedTime } from '@/lib/utils/date';

const habit = { schedule: 'weekly:4', startDate: '2024-02-01', endDate: null };

describe('schedule policy', () => {
  it('distinguishes daily, weekdays, weekends, custom masks, and bounded dates', () => {
    const base = { startDate: '2026-10-05', endDate: '2026-10-10' };
    expect(isFixedOccurrence({ ...base, schedule: 'daily' }, '2026-10-05', 1)).toBe(true);
    expect(isFixedOccurrence({ ...base, schedule: 'weekdays' }, '2026-10-10', 6)).toBe(false);
    expect(isFixedOccurrence({ ...base, schedule: 'weekends' }, '2026-10-10', 6)).toBe(true);
    expect(isFixedOccurrence({ ...base, schedule: 'custom:0100000' }, '2026-10-06', 2)).toBe(true);
    expect(isFixedOccurrence({ ...base, schedule: 'daily' }, '2026-10-11', 0)).toBe(false);
    expect(scheduleStats({ ...base, schedule: 'daily' }, [], new Set(), '2026-10-10')).toEqual({
      total: 0,
      completed: 0,
    });
  });
  it('does not turn a flexible quota into seven daily obligations', () => {
    const day = { date: '2024-02-29', day: 29, weekday: 'Thu', dayOfWeek: 4 };
    expect(isGridApplicable(habit, day, [day], new Set())).toBe(true);
    expect(scheduleStats(habit, [day], new Set([day.date]), day.date)).toEqual({
      total: 0,
      completed: 0,
    });
    expect(isFixedOccurrence(habit, day.date, 4)).toBe(false);
  });

  it('uses the complete week across leap-month boundaries and configurable starts', () => {
    const dates = new Set(['2024-02-29', '2024-03-01', '2024-03-02', '2024-03-03']);
    expect(weekStart('2024-03-01', 1)).toBe('2024-02-26');
    expect(weekStart('2024-03-01', 0)).toBe('2024-02-25');
    expect(weeklyQuotaAttainment(habit, '2024-03-01', dates, '2024-03-03', 1)).toEqual({
      goal: 4,
      completed: 4,
      achieved: true,
    });
  });

  it('respects start and end dates without penalizing rest days', () => {
    const bounded = { ...habit, startDate: '2024-03-01', endDate: '2024-03-02' };
    expect(
      weeklyQuotaAttainment(bounded, '2024-03-01', new Set(['2024-03-01']), '2024-03-03'),
    ).toEqual({ goal: 2, completed: 1, achieved: false });
    expect(isFixedOccurrence({ ...habit, schedule: 'weekdays' }, '2024-03-03', 0)).toBe(false);
  });

  it('accepts Colombo and rejects invalid timezone identifiers', () => {
    expect(
      UserSettingsSchema.safeParse({ timezone: 'Asia/Colombo', weekStartsOn: 1, theme: 'system' })
        .success,
    ).toBe(true);
    expect(
      UserSettingsSchema.safeParse({ timezone: 'Moon/Base', weekStartsOn: 1, theme: 'system' })
        .success,
    ).toBe(false);
  });

  it('keeps a Colombo calendar date when UTC is still on the previous day', () => {
    const instant = new Date('2026-10-07T20:00:00Z');
    expect(toDateString(toZonedTime(instant, 'Asia/Colombo'))).toBe('2026-10-08');
    expect(toDateString(toZonedTime(instant, 'UTC'))).toBe('2026-10-07');
  });
});
