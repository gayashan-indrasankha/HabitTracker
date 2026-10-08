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

export function addCalendarDays(date: string, count: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
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
): BlockOccurrence[] {
  const overrides = new Map(
    exceptions.map((item) => [`${item.blockId}:${item.occurrenceDate}`, item]),
  );
  const result: BlockOccurrence[] = [];
  for (const block of blocks) {
    for (let date = start; date <= end; date = addCalendarDays(date, 1)) {
      if (!occursOn(block, date)) continue;
      const exception = overrides.get(`${block.id}:${date}`);
      if (exception?.status === 'skipped') continue;
      const displayed = exception?.overrideDate ?? date;
      if (displayed < start || displayed > end) continue;
      result.push({
        ...block,
        date: displayed,
        originalDate: date,
        localStartTime: exception?.overrideStartTime ?? block.localStartTime,
        localEndTime: exception?.overrideEndTime ?? block.localEndTime,
        occurrenceStatus: exception?.status ?? 'planned',
        reason: exception?.reason ?? null,
      });
    }
  }
  // A moved occurrence may originate outside the requested window. Completed
  // occurrences remain visible after their series is paused or archived.
  const seen = new Set(result.map((item) => `${item.id}:${item.originalDate}`));
  for (const exception of exceptions) {
    if (exception.status === 'skipped') continue;
    const block = blocks.find((item) => item.id === exception.blockId);
    if (!block || !occursOn(block, exception.occurrenceDate, true)) continue;
    const displayed = exception.overrideDate ?? exception.occurrenceDate;
    if (displayed < start || displayed > end || seen.has(`${block.id}:${exception.occurrenceDate}`))
      continue;
    result.push({
      ...block,
      date: displayed,
      originalDate: exception.occurrenceDate,
      localStartTime: exception.overrideStartTime ?? block.localStartTime,
      localEndTime: exception.overrideEndTime ?? block.localEndTime,
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
