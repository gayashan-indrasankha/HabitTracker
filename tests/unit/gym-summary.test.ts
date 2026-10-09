import { describe, expect, it } from 'vitest';
import { gymWeekSummary } from '@/lib/planning/gym-summary';
import { expandBlocks, type BlockRule } from '@/lib/planning/time-blocks';

const dates = [
  '2026-12-28',
  '2026-12-29',
  '2026-12-30',
  '2026-12-31',
  '2027-01-01',
  '2027-01-02',
  '2027-01-03',
];
const block = (id: string, templateKey: string, mask: string, title: string): BlockRule => ({
  id,
  templateKey,
  title,
  category: 'Fitness',
  localStartTime: '17:30',
  localEndTime: '18:30',
  weekdayMask: mask,
  startDate: dates[0],
  endDate: null,
  isFixed: false,
  status: 'active',
});
const done = (
  blockId: string,
  occurrenceDate: string,
  overrideDate: string | null = null,
  status = 'completed',
) => ({
  blockId,
  occurrenceDate,
  overrideDate,
  overrideStartTime: null,
  overrideEndTime: null,
  status,
  reason: null,
});

describe('weekly gym activity', () => {
  it('deduplicates habit checks against four main visits and an optional fifth', () => {
    const rules = [
      block('main', 'gym-4-block', '0110110', 'Gym training'),
      block('optional', 'optional-gym-5', '0000001', 'Technique practice'),
    ];
    const exceptions = [
      done('main', dates[1]),
      done('main', dates[2]),
      done('main', dates[4]),
      done('main', dates[5]),
      done('optional', dates[6]),
    ];
    const occurrences = expandBlocks(rules, exceptions, dates[0], dates[6]);
    const entries = [
      ...[dates[1], dates[2], dates[4], dates[5], dates[6], dates[0]].map((date) => ({
        date,
        habitId: 'gym',
        completed: true,
      })),
    ];
    const result = gymWeekSummary(dates, occurrences, entries, new Set(['gym']));
    expect(result).toMatchObject({
      plannedMain: 4,
      completedMain: 4,
      optionalCompleted: 1,
      techniqueCompleted: 1,
      habitOnlyCompleted: 1,
      totalRecordedVisits: 6,
      restRecoveryDays: 1,
    });
  });

  it('keeps skipped optional and mobility separate from visits and respects moved display dates', () => {
    const rules = [
      block('main', 'gym-4-block', '1000000', 'Gym training'),
      block('optional', 'optional-gym-5', '0100000', 'Mobility/recovery'),
    ];
    const exceptions = [done('main', dates[0], dates[2]), done('optional', dates[1])];
    const result = gymWeekSummary(
      dates,
      expandBlocks(rules, exceptions, dates[0], dates[6]),
      [{ date: dates[0], habitId: 'gym', completed: true }],
      new Set(['gym']),
    );
    expect(result).toMatchObject({
      completedMain: 1,
      optionalCompleted: 0,
      mobilityCompleted: 1,
      habitOnlyCompleted: 1,
      totalRecordedVisits: 2,
      restRecoveryDays: 5,
    });
    const skipped = gymWeekSummary(
      dates,
      expandBlocks(rules, [done('optional', dates[1], null, 'skipped')], dates[0], dates[6]),
      [],
      new Set(['gym']),
    );
    expect(skipped.optionalCompleted).toBe(0);
  });
});
