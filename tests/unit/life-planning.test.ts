import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  expandBlocks,
  occursOn,
  overlaps,
  type BlockRule,
  type BlockException,
} from '@/lib/planning/time-blocks';
import { BlockSchema, GoalSchema, MetricSchema, TaskSchema } from '@/lib/validations/life';

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
});
