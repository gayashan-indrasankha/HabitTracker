import { describe, expect, it } from 'vitest';
import { planPriorityOrder } from '@/lib/planning/priorities';
import { GoalSchema, ProjectSchema } from '@/lib/validations/life';
import {
  expandBlocks,
  futureBoundaryDates,
  ruleOn,
  type BlockRule,
  type BlockRevision,
} from '@/lib/planning/time-blocks';

const goal = {
  area: 'Career',
  title: 'Ship a portfolio',
  description: 'Original',
  targetDate: '2026-12-01',
  priority: '1',
  targetValue: '3',
  targetUnit: 'projects',
};
const project = {
  name: 'Portfolio',
  description: 'Original',
  type: 'General',
  goalId: '',
  deadline: '2026-12-01',
  repositoryUrl: 'https://example.com/repo',
};

describe('entity edit contracts', () => {
  it('accepts meaningful values and explicit optional-field clearing', () => {
    expect(GoalSchema.parse(goal)).toMatchObject({ priority: 1, targetValue: 3 });
    expect(
      GoalSchema.parse({
        ...goal,
        description: '',
        targetDate: '',
        targetValue: '',
        targetUnit: '',
      }),
    ).toMatchObject({ description: null, targetDate: null, targetValue: null, targetUnit: null });
    expect(ProjectSchema.parse(project)).toMatchObject({
      repositoryUrl: 'https://example.com/repo',
    });
    expect(
      ProjectSchema.parse({
        ...project,
        description: '',
        goalId: '',
        deadline: '',
        repositoryUrl: '',
      }),
    ).toMatchObject({ description: null, goalId: null, deadline: null, repositoryUrl: null });
  });

  it('rejects invalid dates, targets, project types, and repository protocols', () => {
    expect(GoalSchema.safeParse({ ...goal, targetDate: '2026-02-30' }).success).toBe(false);
    expect(GoalSchema.safeParse({ ...goal, targetValue: '-1' }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...project, type: 'Other' }).success).toBe(false);
    expect(
      ProjectSchema.safeParse({ ...project, repositoryUrl: 'javascript:alert(1)' }).success,
    ).toBe(false);
  });
});

describe('priority order', () => {
  it('fills three slots and rejects a fourth without replacement', () => {
    const first = planPriorityOrder([], 'a', 'assign', 1);
    const second = planPriorityOrder(first, 'b', 'assign', 2);
    const third = planPriorityOrder(second, 'c', 'assign', 3);
    expect(third).toEqual(['a', 'b', 'c']);
    expect(() => planPriorityOrder(third, 'd', 'assign', 3)).toThrow();
  });

  it('swaps adjacent and distant priorities', () => {
    expect(planPriorityOrder(['a', 'b', 'c'], 'b', 'move', 1)).toEqual(['b', 'a', 'c']);
    expect(planPriorityOrder(['a', 'b', 'c'], 'c', 'move', 2)).toEqual(['a', 'c', 'b']);
    expect(planPriorityOrder(['a', 'b', 'c'], 'a', 'move', 3)).toEqual(['c', 'b', 'a']);
  });

  it('replaces explicitly and compacts after removal', () => {
    expect(planPriorityOrder(['a', 'b', 'c'], 'd', 'replace', 2)).toEqual(['a', 'd', 'c']);
    expect(planPriorityOrder(['a', 'b', 'c'], 'b', 'remove')).toEqual(['a', 'c']);
    expect(planPriorityOrder(['a'], 'a', 'remove')).toEqual([]);
    expect(() => planPriorityOrder(['a'], 'b', 'remove')).toThrow();
  });
});

describe('effective-dated recurrence metadata', () => {
  const block: BlockRule = {
    id: 'series',
    title: 'Study',
    category: 'University',
    localStartTime: '09:00',
    localEndTime: '10:00',
    weekdayMask: '1000000',
    startDate: '2026-10-05',
    endDate: null,
    isFixed: false,
    status: 'active',
    goalId: 'old-goal',
    taskId: null,
    projectId: null,
  };
  const revision: BlockRevision = {
    blockId: 'series',
    effectiveDate: '2026-10-12',
    title: 'Research',
    category: 'Career',
    localStartTime: '14:00',
    localEndTime: '15:00',
    weekdayMask: '0100000',
    status: 'active',
    endDate: '2026-11-30',
    isFixed: true,
    goalId: 'new-goal',
    taskId: null,
    projectId: null,
  };

  it('keeps historical rule and projects all future metadata', () => {
    expect(ruleOn(block, [revision], '2026-10-05')).toEqual(block);
    expect(ruleOn(block, [revision], '2026-10-13')).toMatchObject({
      title: 'Research',
      category: 'Career',
      localStartTime: '14:00',
      weekdayMask: '0100000',
      isFixed: true,
      goalId: 'new-goal',
      endDate: '2026-11-30',
    });
    expect(
      expandBlocks([block], [], '2026-10-05', '2026-10-13', [revision]).map((item) => [
        item.date,
        item.title,
      ]),
    ).toEqual([
      ['2026-10-05', 'Study'],
      ['2026-10-13', 'Research'],
    ]);
  });

  it('retains a completed occurrence after its weekday is removed', () => {
    const exceptions = [
      {
        blockId: 'series',
        occurrenceDate: '2026-10-12',
        overrideDate: null,
        overrideStartTime: null,
        overrideEndTime: null,
        status: 'completed',
        reason: null,
      },
    ];
    expect(
      expandBlocks([block], exceptions, '2026-10-12', '2026-10-13', [revision]).map((item) => [
        item.originalDate,
        item.occurrenceStatus,
      ]),
    ).toContainEqual(['2026-10-12', 'completed']);
  });

  it('checks weeks after later series starts and revisions', () => {
    const later = { ...block, id: 'later', startDate: '2026-12-01' };
    const dates = futureBoundaryDates(
      '2026-10-09',
      [block, later],
      [{ ...revision, effectiveDate: '2027-01-01' }],
      [],
    );
    expect(dates).toContain('2026-12-07');
    expect(dates).toContain('2027-01-07');
  });
});
