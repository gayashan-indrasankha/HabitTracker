import { describe, expect, it } from 'vitest';
import { mealWeekSummary } from '@/lib/nutrition/summary';

describe('optional meal checklist feedback', () => {
  it('keeps absent days unrecorded rather than skipped or consumed', () => {
    expect(
      mealWeekSummary(
        [
          { date: '2026-10-05', status: 'followed' },
          { date: '2026-10-05', status: 'not_followed' },
          { date: '2026-10-07', status: 'followed' },
        ],
        '2026-10-05',
        '2026-10-09',
      ),
    ).toEqual({
      recordedDays: 2,
      followedItems: 2,
      notFollowedItems: 1,
      unrecordedDays: 3,
    });
  });

  it('uses calendar week boundaries across years and ignores future or adjacent weeks', () => {
    expect(
      mealWeekSummary(
        [
          { date: '2026-12-27', status: 'followed' },
          { date: '2027-01-01', status: 'followed' },
          { date: '2027-01-04', status: 'not_followed' },
        ],
        '2026-12-28',
        '2027-01-03',
      ),
    ).toEqual({
      recordedDays: 1,
      followedItems: 1,
      notFollowedItems: 0,
      unrecordedDays: 6,
    });
    expect(mealWeekSummary([], '2026-10-05', '2026-10-05').unrecordedDays).toBe(1);
  });
});
