import { describe, expect, it } from 'vitest';
import {
  canAcceptMilestone,
  englishRatingTrend,
  interviewWeak,
  pipelineSummary,
  topicIndicator,
  validScoredAttempt,
  weakestEnglishDimension,
  weightTrend,
} from '@/lib/evidence/summary';

describe('P3 evidence policies', () => {
  it('rejects impossible scored attempts and keeps unscored practice valid', () => {
    expect(validScoredAttempt(null, null)).toBe(true);
    expect(validScoredAttempt(8, 10)).toBe(true);
    expect(validScoredAttempt(11, 10)).toBe(false);
    expect(validScoredAttempt(0, 0)).toBe(false);
    expect(validScoredAttempt(5, null)).toBe(false);
  });
  it('requires supported, user-confirmed mastery and flags weak or due evidence', () => {
    expect(topicIndicator('demonstrated_mastery', null, [], '2026-10-08')).toBe('Not assessed');
    expect(
      topicIndicator(
        'demonstrated_mastery',
        null,
        [{ date: '2026-10-07', correct: 9, total: 10 }],
        '2026-10-08',
      ),
    ).toBe('Practising');
    const strong = [
      { date: '2026-10-07', correct: 9, total: 10 },
      { date: '2026-10-03', correct: 8, total: 10 },
    ];
    expect(topicIndicator('demonstrated_mastery', null, strong, '2026-10-08')).toBe(
      'Demonstrated mastery',
    );
    expect(topicIndicator('practising', null, strong, '2026-10-08')).toBe('Practising');
    expect(topicIndicator('demonstrated_mastery', '2026-10-08', strong, '2026-10-08')).toBe(
      'Needs review',
    );
    expect(
      topicIndicator(
        'demonstrated_mastery',
        null,
        [{ date: '2026-10-08', correct: 4, total: 10 }, ...strong],
        '2026-10-08',
      ),
    ).toBe('Needs review');
  });
  it('separates completed tasks from reviewed milestone criteria', () => {
    expect(canAcceptMilestone([])).toBe(false);
    expect(canAcceptMilestone([{ met: true }, { met: false }])).toBe(false);
    expect(canAcceptMilestone([{ met: true }, { met: true }])).toBe(true);
  });
  it('derives interview weakness and English self-assessment only from recorded ratings', () => {
    expect(
      interviewWeak({
        weaknesses: null,
        technical: null,
        approach: null,
        clarity: null,
        tradeoffs: null,
      }),
    ).toBe(false);
    expect(
      interviewWeak({ weaknesses: null, technical: 2, approach: 4, clarity: 4, tradeoffs: null }),
    ).toBe(true);
    expect(weakestEnglishDimension([])).toBeNull();
    expect(
      weakestEnglishDimension([
        { fluency: 4, grammar: 2, clarity: 3, pronunciation: null, confidence: 4 },
      ]),
    ).toBe('grammar');
  });
  it('compares English ratings across measured days without inventing missing scores', () => {
    const sessions = [
      { date: '2026-10-08', fluency: 4, grammar: null, clarity: null, pronunciation: null, confidence: null },
      { date: '2026-10-08', fluency: 2, grammar: null, clarity: null, pronunciation: null, confidence: null },
      { date: '2026-10-01', fluency: 2, grammar: 3, clarity: null, pronunciation: null, confidence: null },
    ];
    const trends = englishRatingTrend(sessions);
    expect(trends.find((item) => item.dimension === 'fluency')).toMatchObject({
      first: 2,
      latest: 3,
      change: 1,
      measuredDays: 2,
    });
    expect(trends.find((item) => item.dimension === 'grammar')).toMatchObject({
      latest: 3,
      change: null,
      measuredDays: 1,
    });
    expect(trends.find((item) => item.dimension === 'clarity')?.latest).toBeNull();
  });
  it('averages same-day readings once and respects cross-year preferred week starts', () => {
    const points = [
      { date: '2026-12-31', value: 70 },
      { date: '2026-12-31', value: 72 },
      { date: '2027-01-01', value: 73 },
      { date: '2027-01-04', value: 74 },
    ];
    const monday = weightTrend(points, 1, 80);
    expect(monday.daily[0]).toEqual({ date: '2026-12-31', value: 71, samples: 2 });
    expect(monday.weekly).toEqual([
      { date: '2026-12-28', average: 72, days: 2 },
      { date: '2027-01-04', average: 74, days: 1 },
    ]);
    expect(monday.changeFromPrevious).toBe(2);
    expect(monday.changeFromBaseline).toBe(3);
    expect(monday.progressToTarget).toBeCloseTo(3 / 9);
    expect(weightTrend(points, 0, null).weekly[0].date).toBe('2026-12-27');
    expect(weightTrend([], 1, 80).latest).toBeNull();
  });
  it('keeps saved opportunities separate from submitted and employer outcomes', () => {
    const rows = [
      { stage: 'saved', appliedOn: null, followUpDate: null },
      { stage: 'online_assessment', appliedOn: '2026-10-01', followUpDate: '2026-10-07' },
      { stage: 'technical_interview', appliedOn: '2026-10-02', followUpDate: '2026-10-10' },
      { stage: 'rejected', appliedOn: '2026-09-01', followUpDate: null },
    ];
    expect(pipelineSummary(rows, '2026-10-08')).toEqual({
      submitted: 3,
      active: 2,
      assessments: 1,
      interviews: 1,
      offers: 0,
      rejected: 1,
      overdue: 1,
    });
  });
});
