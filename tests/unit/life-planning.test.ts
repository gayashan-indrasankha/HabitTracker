import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  expandBlocks,
  occursOn,
  overlaps,
  ruleOn,
  sameOccurrence,
  type BlockRule,
  type BlockException,
} from '@/lib/planning/time-blocks';
import { BlockSchema, GoalSchema, MetricSchema, TaskSchema } from '@/lib/validations/life';
import { scheduledInstant, statusTimeError } from '@/lib/planning/occurrence-time';

const block: BlockRule = {
  id: 'a',
  title: 'Study',
  category: 'University',
  localStartTime: '09:00',
  localEndTime: '10:00',
  weekdayMask: '1000000',
  startDate: '2026-10-01',
  endDate: null,
  isFixed: false,
  status: 'active',
};

describe('weekly planning', () => {
  it('expands Monday rules and a single moved occurrence without changing later Mondays', () => {
    const exception: BlockException = {
      blockId: 'a',
      occurrenceDate: '2026-10-05',
      overrideDate: '2026-10-06',
      overrideStartTime: '11:00',
      overrideEndTime: '12:00',
      status: 'rescheduled',
      reason: null,
    };
    const week = expandBlocks([block], [exception], '2026-10-05', '2026-10-11');
    expect(week).toHaveLength(1);
    expect(week[0]).toMatchObject({
      date: '2026-10-06',
      originalDate: '2026-10-05',
      localStartTime: '11:00',
    });
    expect(expandBlocks([block], [exception], '2026-10-12', '2026-10-18')[0].date).toBe(
      '2026-10-12',
    );
  });

  it('keeps fixed and paused recurrence rules explicit', () => {
    expect(occursOn(block, '2026-10-05')).toBe(true);
    expect(occursOn(block, '2026-10-06')).toBe(false);
    expect(occursOn({ ...block, status: 'paused' }, '2026-10-05')).toBe(false);
    const past: BlockException = {
      blockId: 'a',
      occurrenceDate: '2026-10-05',
      overrideDate: null,
      overrideStartTime: null,
      overrideEndTime: null,
      status: 'completed',
      reason: null,
    };
    expect(
      expandBlocks([{ ...block, status: 'paused' }], [past], '2026-10-05', '2026-10-11'),
    ).toHaveLength(1);
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addCalendarDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(overlaps(block, { localStartTime: '09:45', localEndTime: '11:00' })).toBe(true);
    expect(overlaps(block, { localStartTime: '10:00', localEndTime: '11:00' })).toBe(false);
  });

  it('validates time ranges, linked IDs, metrics, and optional targets', () => {
    const input = {
      title: 'Work',
      category: 'Career',
      localStartTime: '10:00',
      localEndTime: '09:00',
      weekdayMask: '1000000',
      startDate: '2026-10-05',
      endDate: '',
      isFixed: false,
      taskId: '',
      goalId: '',
      projectId: '',
      allowOverlap: false,
    };
    expect(BlockSchema.safeParse(input).success).toBe(false);
    expect(BlockSchema.safeParse({ ...input, localEndTime: '11:00' }).success).toBe(true);
    expect(
      GoalSchema.parse({
        area: 'Fitness',
        title: 'Gain weight',
        description: '',
        targetDate: '',
        priority: '2',
        targetValue: '',
        targetUnit: '',
      }).targetValue,
    ).toBeNull();
    expect(
      TaskSchema.safeParse({
        title: 'X',
        details: '',
        area: 'Career',
        priority: '2',
        estimatedMinutes: '',
        dueDate: '',
        scheduledDate: '',
        goalId: 'foreign',
        projectId: '',
        isMilestone: false,
      }).success,
    ).toBe(false);
    expect(
      MetricSchema.safeParse({
        date: '2026-10-08',
        type: 'Body weight',
        value: -2,
        unit: 'kg',
        note: '',
      }).success,
    ).toBe(false);
  });

  it('keeps an earlier occurrence at its old time and hides only future paused dates', () => {
    const revisions = [
      {
        id: 'revision-row',
        blockId: 'a',
        effectiveDate: '2026-10-01',
        title: 'Study',
        category: 'University',
        localStartTime: '09:00',
        localEndTime: '10:00',
        weekdayMask: '1000000',
        status: 'active',
      },
      {
        blockId: 'a',
        effectiveDate: '2026-10-12',
        title: 'Study',
        category: 'University',
        localStartTime: '14:00',
        localEndTime: '15:00',
        weekdayMask: '1000000',
        status: 'active',
      },
      {
        blockId: 'a',
        effectiveDate: '2026-10-19',
        title: 'Study',
        category: 'University',
        localStartTime: '14:00',
        localEndTime: '15:00',
        weekdayMask: '1000000',
        status: 'paused',
      },
      {
        blockId: 'a',
        effectiveDate: '2026-10-26',
        title: 'Study',
        category: 'University',
        localStartTime: '14:00',
        localEndTime: '15:00',
        weekdayMask: '1000000',
        status: 'active',
      },
    ];
    expect(expandBlocks([block], [], '2026-10-05', '2026-10-05', revisions)[0].localStartTime).toBe(
      '09:00',
    );
    expect(expandBlocks([block], [], '2026-10-12', '2026-10-12', revisions)[0].localStartTime).toBe(
      '14:00',
    );
    expect(expandBlocks([block], [], '2026-10-19', '2026-10-19', revisions)).toHaveLength(0);
    expect(expandBlocks([block], [], '2026-10-26', '2026-10-26', revisions)).toHaveLength(1);
    expect(ruleOn(block, revisions, '2026-10-05').localStartTime).toBe('09:00');
    expect(ruleOn(block, revisions, '2026-10-05').id).toBe('a');
    const movedFromRemovedDay: BlockException = {
      blockId: 'a',
      occurrenceDate: '2026-10-12',
      overrideDate: '2026-10-13',
      overrideStartTime: null,
      overrideEndTime: null,
      status: 'rescheduled',
      reason: null,
    };
    const changedDays = [
      ...revisions,
      {
        blockId: 'a',
        effectiveDate: '2026-10-12',
        title: 'Study',
        category: 'University',
        localStartTime: '14:00',
        localEndTime: '15:00',
        weekdayMask: '0010000',
        status: 'active',
      },
    ];
    expect(
      expandBlocks([block], [movedFromRemovedDay], '2026-10-13', '2026-10-13', changedDays),
    ).toMatchObject([{ originalDate: '2026-10-12', date: '2026-10-13' }]);
  });

  it('keeps skipped occurrences visible and distinguishes same-series identities', () => {
    const skip: BlockException = {
      blockId: 'a',
      occurrenceDate: '2026-10-05',
      overrideDate: null,
      overrideStartTime: null,
      overrideEndTime: null,
      status: 'skipped',
      reason: 'Sick',
    };
    const week = expandBlocks([block], [skip], '2026-10-05', '2026-10-11');
    expect(week[0]).toMatchObject({
      occurrenceStatus: 'skipped',
      reason: 'Sick',
      originalDate: '2026-10-05',
    });
    expect(sameOccurrence(week[0], { id: 'a', originalDate: '2026-10-07' })).toBe(false);
    expect(sameOccurrence(week[0], { id: 'a', originalDate: '2026-10-05' })).toBe(true);
    const mondayAndWednesday = { ...block, weekdayMask: '1010000' };
    const moved = {
      ...skip,
      status: 'rescheduled',
      overrideDate: '2026-10-07',
      overrideStartTime: '09:30',
      overrideEndTime: '10:30',
    };
    const two = expandBlocks([mondayAndWednesday], [moved], '2026-10-05', '2026-10-11');
    expect(two).toHaveLength(2);
    expect(two[0].date).toBe(two[1].date);
    expect(sameOccurrence(two[0], two[1])).toBe(false);
    expect(overlaps(two[0], two[1])).toBe(true);
  });

  it('checks completion against local end time and rejects DST gaps', () => {
    const now = new Date('2026-10-08T12:30:00Z'); // 18:00 in Colombo
    expect(
      statusTimeError('completed', '2026-10-08', '17:30', '18:45', 'Asia/Colombo', now),
    ).toMatch(/finished/);
    expect(
      statusTimeError('started', '2026-10-08', '17:30', '18:45', 'Asia/Colombo', now),
    ).toBeNull();
    expect(
      statusTimeError(
        'completed',
        '2026-10-08',
        '17:30',
        '18:45',
        'Asia/Colombo',
        new Date('2026-10-08T13:16:00Z'),
      ),
    ).toBeNull();
    expect(
      statusTimeError('completed', '2026-10-09', '17:30', '18:45', 'Asia/Colombo', now),
    ).toMatch(/finished/);
    expect(
      statusTimeError(
        'completed',
        '2026-10-09',
        '00:10',
        '00:20',
        'Asia/Colombo',
        new Date('2026-10-08T19:00:00Z'),
      ),
    ).toBeNull();
    expect(scheduledInstant('2026-03-08', '02:30', 'America/New_York')).toBeNull();
    expect(scheduledInstant('2026-11-01', '01:30', 'America/New_York')).toBeNull();
  });
});
