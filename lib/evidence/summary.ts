import { weekStart } from '@/lib/analytics/habit-month-progress';

export type TopicEvidence = { date: string; correct: number | null; total: number | null };
export function validScoredAttempt(correct: number | null, total: number | null) {
  return (
    (correct == null && total == null) ||
    (correct != null &&
      total != null &&
      Number.isInteger(correct) &&
      Number.isInteger(total) &&
      total > 0 &&
      correct >= 0 &&
      correct <= total)
  );
}
export function canAcceptMilestone(criteria: { met: boolean }[]) {
  return criteria.length > 0 && criteria.every((item) => item.met);
}
export function interviewWeak(session: {
  weaknesses: string | null;
  technical: number | null;
  approach: number | null;
  clarity: number | null;
  tradeoffs: number | null;
}) {
  return (
    Boolean(session.weaknesses) ||
    [session.technical, session.approach, session.clarity, session.tradeoffs].some(
      (score) => score != null && score <= 2,
    )
  );
}
export function weakestEnglishDimension(
  sessions: {
    fluency: number | null;
    grammar: number | null;
    clarity: number | null;
    pronunciation: number | null;
    confidence: number | null;
  }[],
) {
  const keys = ['fluency', 'grammar', 'clarity', 'pronunciation', 'confidence'] as const;
  return (
    keys
      .map((key) => ({
        key,
        values: sessions.map((item) => item[key]).filter((item): item is number => item != null),
      }))
      .filter((item) => item.values.length)
      .sort(
        (a, b) =>
          a.values.reduce((s, n) => s + n, 0) / a.values.length -
          b.values.reduce((s, n) => s + n, 0) / b.values.length,
      )[0]?.key ?? null
  );
}

export const englishDimensions = [
  'fluency',
  'grammar',
  'clarity',
  'pronunciation',
  'confidence',
] as const;
export type EnglishDimension = (typeof englishDimensions)[number];
export function englishRatingTrend(
  sessions: ({ date: string } & Record<EnglishDimension, number | null>)[],
) {
  return englishDimensions.map((dimension) => {
    const dates = [
      ...new Set(sessions.filter((item) => item[dimension] != null).map((item) => item.date)),
    ].sort();
    const average = (date: string) => {
      const values = sessions
        .filter((item) => item.date === date && item[dimension] != null)
        .map((item) => item[dimension]!);
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };
    const first = dates[0] ? average(dates[0]) : null;
    const latest = dates.at(-1) ? average(dates.at(-1)!) : null;
    return {
      dimension,
      measuredDays: dates.length,
      first,
      latest,
      change: dates.length > 1 && first != null && latest != null ? latest - first : null,
    };
  });
}
export function topicIndicator(
  status: string,
  revisionDate: string | null,
  practices: TopicEvidence[],
  today: string,
) {
  if (!practices.length) return 'Not assessed';
  const scored = practices
    .filter((item) => item.correct != null && item.total != null && item.total > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const latest = scored[0];
  if (latest && latest.correct! / latest.total! < 0.7) return 'Needs review';
  if (revisionDate && revisionDate <= today) return 'Needs review';
  if (
    status === 'demonstrated_mastery' &&
    scored.filter((item) => item.correct! / item.total! >= 0.8).length >= 2
  )
    return 'Demonstrated mastery';
  return 'Practising';
}

export type WeightPoint = { date: string; value: number };
export function weightTrend(
  points: WeightPoint[],
  weekStartsOn: number,
  target: number | null,
  baselinePoint?: WeightPoint | null,
) {
  const dates = [...new Set(points.map((item) => item.date))].sort();
  const daily = dates.map((date) => {
    const values = points.filter((item) => item.date === date).map((item) => item.value);
    return {
      date,
      value: values.reduce((sum, value) => sum + value, 0) / values.length,
      samples: values.length,
    };
  });
  const weekKeys = [...new Set(daily.map((item) => weekStart(item.date, weekStartsOn)))].sort();
  const weekly = weekKeys.map((date) => {
    const values = daily.filter((item) => weekStart(item.date, weekStartsOn) === date);
    return {
      date,
      average: values.reduce((sum, item) => sum + item.value, 0) / values.length,
      days: values.length,
    };
  });
  const latest = weekly.at(-1) ?? null;
  const previous = weekly.at(-2) ?? null;
  const baseline = baselinePoint?.value ?? daily[0]?.value ?? null;
  return {
    daily,
    weekly,
    latest,
    previous,
    baseline,
    changeFromBaseline: baseline == null || !latest ? null : latest.average - baseline,
    changeFromPrevious: !latest || !previous ? null : latest.average - previous.average,
    progressToTarget:
      baseline == null || !latest || target == null || target <= baseline
        ? null
        : (latest.average - baseline) / (target - baseline),
    limited: daily.length < 3,
  };
}

export type ApplicationStage = {
  stage: string;
  appliedOn: string | null;
  followUpDate: string | null;
};
export function pipelineSummary(applications: ApplicationStage[], today: string) {
  const activeStages = new Set([
    'applied',
    'online_assessment',
    'technical_interview',
    'hr_interview',
    'custom',
  ]);
  const interviewStages = new Set(['technical_interview', 'hr_interview']);
  return {
    submitted: applications.filter((item) => item.appliedOn != null).length,
    active: applications.filter((item) => activeStages.has(item.stage)).length,
    assessments: applications.filter((item) => item.stage === 'online_assessment').length,
    interviews: applications.filter((item) => interviewStages.has(item.stage)).length,
    offers: applications.filter((item) => item.stage === 'offer').length,
    rejected: applications.filter((item) => item.stage === 'rejected').length,
    overdue: applications.filter(
      (item) => item.followUpDate && item.followUpDate < today && activeStages.has(item.stage),
    ).length,
  };
}
