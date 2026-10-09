import type { BlockOccurrence } from './time-blocks';

type GymEntry = { date: string; completed: boolean; habitId: string };

/** Completed block identities are visits; a matching gym-habit check on that day is the same visit. */
export function gymWeekSummary(
  dates: string[],
  occurrences: BlockOccurrence[],
  entries: GymEntry[],
  gymHabitIds: ReadonlySet<string>,
) {
  const main = occurrences.filter((item) => item.templateKey === 'gym-4-block');
  const optional = occurrences.filter((item) => item.templateKey === 'optional-gym-5');
  const active = (item: BlockOccurrence) => !['skipped', 'excused'].includes(item.occurrenceStatus);
  const completed = (item: BlockOccurrence) => item.occurrenceStatus === 'completed';
  const mainCompleted = main.filter(completed);
  const optionalCompleted = optional.filter(completed);
  const optionalVisits = optionalCompleted.filter((item) => item.title !== 'Mobility/recovery');
  const blockVisitDates = new Set([...mainCompleted, ...optionalVisits].map((item) => item.date));
  const habitOnlyDates = new Set(
    entries
      .filter(
        (item) =>
          item.completed &&
          gymHabitIds.has(item.habitId) &&
          dates.includes(item.date) &&
          !blockVisitDates.has(item.date),
      )
      .map((item) => item.date),
  );
  const visitDates = new Set([...blockVisitDates, ...habitOnlyDates]);
  return {
    plannedMain: main.filter(active).length,
    completedMain: mainCompleted.length,
    optionalCompleted: optionalVisits.length,
    techniqueCompleted: optionalVisits.filter((item) => item.title === 'Technique practice').length,
    mobilityCompleted: optionalCompleted.filter((item) => item.title === 'Mobility/recovery')
      .length,
    habitOnlyCompleted: habitOnlyDates.size,
    totalRecordedVisits: mainCompleted.length + optionalVisits.length + habitOnlyDates.size,
    restRecoveryDays: dates.filter((date) => !visitDates.has(date)).length,
  };
}
