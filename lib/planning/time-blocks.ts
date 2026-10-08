export type BlockRule = {
  id: string;
  title: string;
  category: string;
  localStartTime: string;
  localEndTime: string;
  weekdayMask: string;
  startDate: string;
  endDate: string | null;
  isFixed: boolean;
  status: string;
  taskId?: string | null;
  goalId?: string | null;
  projectId?: string | null;
};

export type BlockException = {
  blockId: string;
  occurrenceDate: string;
  overrideDate: string | null;
  overrideStartTime: string | null;
  overrideEndTime: string | null;
  status: string;
  reason: string | null;
};

export type BlockOccurrence = BlockRule & {
  date: string;
  originalDate: string;
  occurrenceStatus: string;
  reason: string | null;
};

export type BlockRevision = Pick<
  BlockRule,
  'title' | 'category' | 'localStartTime' | 'localEndTime' | 'weekdayMask' | 'status'
> &
  Partial<Pick<BlockRule, 'endDate' | 'isFixed' | 'taskId' | 'goalId' | 'projectId'>> & {
    blockId: string;
    effectiveDate: string;
  };

export function ruleOn(block: BlockRule, revisions: BlockRevision[], date: string): BlockRule {
  const revision = revisions
    .filter((item) => item.blockId === block.id && item.effectiveDate <= date)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
  return revision
    ? {
        ...block,
        title: revision.title,
        category: revision.category,
        localStartTime: revision.localStartTime,
        localEndTime: revision.localEndTime,
        weekdayMask: revision.weekdayMask,
        status: revision.status,
        endDate: revision.endDate === undefined ? block.endDate : revision.endDate,
        isFixed: revision.isFixed === undefined ? block.isFixed : revision.isFixed,
        taskId: revision.taskId === undefined ? block.taskId : revision.taskId,
        goalId: revision.goalId === undefined ? block.goalId : revision.goalId,
        projectId: revision.projectId === undefined ? block.projectId : revision.projectId,
      }
    : block;
}

export function sameOccurrence(
  a: { id: string; originalDate: string },
  b: { id: string; originalDate: string },
): boolean {
  return a.id === b.id && a.originalDate === b.originalDate;
}

export function addCalendarDays(date: string, count: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

// A weekly rule repeats after seven days until a series starts or a revision
// changes it. Check one full week after every future rule boundary, plus moved
// and recorded exception dates, rather than only the edit's first week.
export function futureBoundaryDates(
  start: string,
  blocks: BlockRule[],
  revisions: BlockRevision[],
  exceptions: BlockException[],
): string[] {
  const anchors = new Set([start]);
  for (const block of blocks) if (block.startDate >= start) anchors.add(block.startDate);
  for (const revision of revisions)
    if (revision.effectiveDate >= start) anchors.add(revision.effectiveDate);
  const dates = new Set<string>();
  for (const anchor of anchors)
    for (let day = 0; day < 7; day++) dates.add(addCalendarDays(anchor, day));
  for (const exception of exceptions) {
    if (exception.occurrenceDate >= start) dates.add(exception.occurrenceDate);
    if (exception.overrideDate && exception.overrideDate >= start)
      dates.add(exception.overrideDate);
  }
  return [...dates].sort();
}

export function weekdayIndex(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function occursOn(block: BlockRule, date: string, includeInactive = false): boolean {
  return (
    (includeInactive || block.status === 'active') &&
    date >= block.startDate &&
    (!block.endDate || date <= block.endDate) &&
    block.weekdayMask[weekdayIndex(date)] === '1'
  );
}

export function expandBlocks(
  blocks: BlockRule[],
  exceptions: BlockException[],
  start: string,
  end: string,
  revisions: BlockRevision[] = [],
): BlockOccurrence[] {
  const overrides = new Map(
    exceptions.map((item) => [`${item.blockId}:${item.occurrenceDate}`, item]),
  );
  const result: BlockOccurrence[] = [];
  for (const block of blocks) {
    for (let date = start; date <= end; date = addCalendarDays(date, 1)) {
      const rule = ruleOn(block, revisions, date);
      if (!occursOn(rule, date)) continue;
      const exception = overrides.get(`${block.id}:${date}`);
      const displayed = exception?.status === 'skipped' ? date : (exception?.overrideDate ?? date);
      if (displayed < start || displayed > end) continue;
      result.push({
        ...rule,
        date: displayed,
        originalDate: date,
        localStartTime:
          exception?.status === 'skipped'
            ? rule.localStartTime
            : (exception?.overrideStartTime ?? rule.localStartTime),
        localEndTime:
          exception?.status === 'skipped'
            ? rule.localEndTime
            : (exception?.overrideEndTime ?? rule.localEndTime),
        occurrenceStatus: exception?.status ?? 'planned',
        reason: exception?.reason ?? null,
      });
    }
  }
  // A moved occurrence may originate outside the requested window. Completed
  // occurrences remain visible after their series is paused or archived.
  const seen = new Set(result.map((item) => `${item.id}:${item.originalDate}`));
  for (const exception of exceptions) {
    const block = blocks.find((item) => item.id === exception.blockId);
    if (!block) continue;
    const rule = ruleOn(block, revisions, exception.occurrenceDate);
    if (exception.occurrenceDate < block.startDate) continue;
    const displayed =
      exception.status === 'skipped'
        ? exception.occurrenceDate
        : (exception.overrideDate ?? exception.occurrenceDate);
    if (displayed < start || displayed > end || seen.has(`${block.id}:${exception.occurrenceDate}`))
      continue;
    result.push({
      ...rule,
      date: displayed,
      originalDate: exception.occurrenceDate,
      localStartTime:
        exception.status === 'skipped'
          ? rule.localStartTime
          : (exception.overrideStartTime ?? rule.localStartTime),
      localEndTime:
        exception.status === 'skipped'
          ? rule.localEndTime
          : (exception.overrideEndTime ?? rule.localEndTime),
      occurrenceStatus: exception.status,
      reason: exception.reason,
    });
  }
  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || a.localStartTime.localeCompare(b.localStartTime),
  );
}

export function overlaps(
  a: { localStartTime: string; localEndTime: string },
  b: { localStartTime: string; localEndTime: string },
): boolean {
  return a.localStartTime < b.localEndTime && b.localStartTime < a.localEndTime;
}
