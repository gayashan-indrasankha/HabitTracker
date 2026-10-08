import { describe, expect, it } from 'vitest';
import { weekStart } from '@/lib/analytics/habit-month-progress';
import { addCalendarDays, expandBlocks, type BlockRule } from '@/lib/planning/time-blocks';
import { weeklyWorkload } from '@/lib/planning/workload';
import { toDateString, toZonedTime } from '@/lib/utils/date';

const dates = (start: string) => Array.from({ length: 7 }, (_, n) => addCalendarDays(start, n));
const rule = (id: string, overrides: Partial<BlockRule> = {}): BlockRule => ({
  id,
  title: id,
  category: 'University',
  localStartTime: '09:00',
  localEndTime: '10:00',
  weekdayMask: '1000000',
  startDate: '2026-12-28',
  endDate: null,
  isFixed: false,
  status: 'active',
  ...overrides,
});
const task = (id: string, scheduledDate: string, overrides = {}) => ({
  id,
  scheduledDate,
  estimatedMinutes: 30,
  actualMinutes: null,
  area: 'Career',
  status: 'todo',
  ...overrides,
});

describe('P2 weekly workload', () => {
  it('separates fixed and flexible, avoids linked estimates, and distinguishes actual logs', () => {
    const start = '2026-12-28';
    const occurrences = expandBlocks(
      [
        rule('lecture', { isFixed: true, localEndTime: '11:00' }),
        rule('focus', {
          localStartTime: '12:00',
          localEndTime: '13:30',
          taskId: 'linked',
          category: 'Career',
        }),
      ],
      [
        {
          blockId: 'focus',
          occurrenceDate: start,
          overrideDate: null,
          overrideStartTime: null,
          overrideEndTime: null,
          status: 'completed',
          reason: null,
        },
      ],
      start,
      '2027-01-03',
    );
    const result = weeklyWorkload(
      dates(start),
      occurrences,
      [task('linked', start), task('free', start)],
      [{ blockId: 'focus', occurrenceDate: start, actualMinutes: 40 }],
      [],
      100,
    );
    expect(result.fixedMinutes).toBe(120);
    expect(result.flexibleMinutes).toBe(120);
    expect(result.actualMinutes).toBe(40);
    expect(result.actualRecorded).toBe(true);
    expect(result.completedSessions).toBe(1);
    expect(result.daily[0].overloaded).toBe(true);
    expect(result.byArea).toEqual({ University: 120, Career: 120 });
    expect(weeklyWorkload(dates(start), occurrences, [], [], [], null).actualRecorded).toBe(false);
  });

  it('counts moved occurrences in their displayed cross-year week and keeps original identity', () => {
    const session = rule('moved');
    const exception = {
      blockId: 'moved',
      occurrenceDate: '2026-12-28',
      overrideDate: '2027-01-04',
      overrideStartTime: '11:00',
      overrideEndTime: '11:25',
      status: 'rescheduled',
      reason: null,
    };
    const oldWeek = weeklyWorkload(
      dates('2026-12-28'),
      expandBlocks([session], [exception], '2026-12-28', '2027-01-03'),
      [],
      [],
      [],
      null,
    );
    const next = expandBlocks([session], [exception], '2027-01-04', '2027-01-10');
    expect(oldWeek.flexibleMinutes).toBe(0);
    expect(next.filter((item) => item.originalDate === '2026-12-28')).toMatchObject([
      { date: '2027-01-04', localStartTime: '11:00' },
    ]);
    expect(weeklyWorkload(dates('2027-01-04'), next, [], [], [], null).flexibleMinutes).toBe(85);
  });

  it('excludes skipped and excused minutes without counting them as completed', () => {
    const start = '2026-12-28';
    const blocks = [rule('skip'), rule('excuse'), rule('active')];
    const exceptions = [
      {
        blockId: 'skip',
        occurrenceDate: start,
        overrideDate: null,
        overrideStartTime: null,
        overrideEndTime: null,
        status: 'skipped',
        reason: 'busy',
      },
      {
        blockId: 'excuse',
        occurrenceDate: start,
        overrideDate: null,
        overrideStartTime: null,
        overrideEndTime: null,
        status: 'excused',
        reason: 'Travel',
      },
    ];
    const result = weeklyWorkload(
      dates(start),
      expandBlocks(blocks, exceptions, start, '2027-01-03'),
      [],
      [],
      [{ date: start, status: 'active', type: 'Travel' }],
      null,
    );
    expect(result.flexibleMinutes).toBe(60);
    expect(result.skippedSessions).toBe(1);
    expect(result.excusedSessions).toBe(1);
    expect(result.completedSessions).toBe(0);
    expect(result.daily[0].timeOff).toEqual(['Travel']);
  });

  it('uses a linked task actual log only when its session has no actual log', () => {
    const date = '2026-12-28';
    const occurrences = expandBlocks([rule('focus', { taskId: 'linked' })], [], date, '2027-01-03');
    const linked = [task('linked', date, { actualMinutes: 25 })];
    expect(weeklyWorkload(dates(date), occurrences, linked, [], [], null).actualMinutes).toBe(25);
    expect(
      weeklyWorkload(
        dates(date),
        occurrences,
        linked,
        [{ blockId: 'focus', occurrenceDate: date, actualMinutes: 40 }],
        [],
        null,
      ).actualMinutes,
    ).toBe(40);
  });

  it('handles empty weeks, week preference, and Colombo local dates', () => {
    const result = weeklyWorkload(dates('2027-01-03'), [], [], [], [], 60);
    expect(result.fixedMinutes).toBe(0);
    expect(result.flexibleMinutes).toBe(0);
    expect(result.daily.every((day) => !day.overloaded)).toBe(true);
    expect(weekStart('2027-01-03', 0)).toBe('2027-01-03');
    expect(weekStart('2027-01-03', 1)).toBe('2026-12-28');
    expect(toDateString(toZonedTime(new Date('2026-12-31T20:00:00Z'), 'Asia/Colombo'))).toBe(
      '2027-01-01',
    );
  });
});
