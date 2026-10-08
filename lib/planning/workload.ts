import type { BlockOccurrence } from './time-blocks';

type TaskWork = {
  id: string;
  scheduledDate: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  area: string;
  status: string;
};
type RecordedSession = { blockId: string; occurrenceDate: string; actualMinutes: number | null };
type TimeOff = { date: string; status: string; type: string };

export function clockMinutes(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - sh * 60 - sm;
}

export function weeklyWorkload(
  dates: string[],
  occurrences: BlockOccurrence[],
  tasks: TaskWork[],
  records: RecordedSession[],
  timeOff: TimeOff[],
  capacityMinutes: number | null,
) {
  const linked = new Set(occurrences.map((item) => item.taskId).filter(Boolean));
  const actualByOccurrence = new Map(
    records.map((item) => [`${item.blockId}:${item.occurrenceDate}`, item.actualMinutes]),
  );
  const daily = dates.map((date) => {
    const sessions = occurrences.filter((item) => item.date === date);
    const active = sessions.filter(
      (item) => !['skipped', 'excused'].includes(item.occurrenceStatus),
    );
    const unblocked = tasks.filter(
      (item) => item.scheduledDate === date && !linked.has(item.id) && item.status !== 'cancelled',
    );
    const fixedMinutes = active
      .filter((item) => item.isFixed)
      .reduce((sum, item) => sum + clockMinutes(item.localStartTime, item.localEndTime), 0);
    const flexibleMinutes =
      active
        .filter((item) => !item.isFixed)
        .reduce((sum, item) => sum + clockMinutes(item.localStartTime, item.localEndTime), 0) +
      unblocked.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0);
    const actualValues = sessions
      .map((item) => actualByOccurrence.get(`${item.id}:${item.originalDate}`))
      .filter((value): value is number => value != null);
    const linkedTaskActual = tasks
      .filter(
        (task) =>
          task.scheduledDate === date &&
          linked.has(task.id) &&
          task.actualMinutes != null &&
          !sessions.some(
            (session) =>
              session.taskId === task.id &&
              actualByOccurrence.get(`${session.id}:${session.originalDate}`) != null,
          ),
      )
      .map((task) => task.actualMinutes!);
    const actualMinutes =
      actualValues.reduce((sum, value) => sum + value, 0) +
      linkedTaskActual.reduce((sum, value) => sum + value, 0) +
      unblocked.reduce((sum, item) => sum + (item.actualMinutes ?? 0), 0);
    const actualRecorded =
      actualValues.length > 0 ||
      linkedTaskActual.length > 0 ||
      unblocked.some((item) => item.actualMinutes != null);
    const byArea: Record<string, number> = {};
    for (const item of active)
      byArea[item.category] =
        (byArea[item.category] ?? 0) + clockMinutes(item.localStartTime, item.localEndTime);
    for (const item of unblocked)
      byArea[item.area] = (byArea[item.area] ?? 0) + (item.estimatedMinutes ?? 0);
    return {
      date,
      fixedMinutes,
      flexibleMinutes,
      actualMinutes,
      actualRecorded,
      completedSessions: sessions.filter((item) => item.occurrenceStatus === 'completed').length,
      skippedSessions: sessions.filter((item) => item.occurrenceStatus === 'skipped').length,
      excusedSessions: sessions.filter((item) => item.occurrenceStatus === 'excused').length,
      byArea,
      timeOff: timeOff
        .filter((item) => item.date === date && item.status === 'active')
        .map((item) => item.type),
      overloaded: capacityMinutes != null && flexibleMinutes > capacityMinutes,
    };
  });
  const byArea: Record<string, number> = {};
  for (const day of daily)
    for (const [area, minutes] of Object.entries(day.byArea))
      byArea[area] = (byArea[area] ?? 0) + minutes;
  return {
    daily,
    byArea,
    fixedMinutes: daily.reduce((sum, day) => sum + day.fixedMinutes, 0),
    flexibleMinutes: daily.reduce((sum, day) => sum + day.flexibleMinutes, 0),
    actualMinutes: daily.reduce((sum, day) => sum + day.actualMinutes, 0),
    actualRecorded: daily.some((day) => day.actualRecorded),
    completedSessions: daily.reduce((sum, day) => sum + day.completedSessions, 0),
    skippedSessions: daily.reduce((sum, day) => sum + day.skippedSessions, 0),
    excusedSessions: daily.reduce((sum, day) => sum + day.excusedSessions, 0),
  };
}
