export type PriorityOperation = 'assign' | 'move' | 'replace' | 'remove';

export function planPriorityOrder(
  current: string[],
  taskId: string,
  operation: PriorityOperation,
  rank?: number,
): string[] {
  const ordered = [...current];
  const oldIndex = ordered.indexOf(taskId);
  if (operation === 'remove') {
    if (oldIndex < 0) throw new Error('Task is not a priority.');
    ordered.splice(oldIndex, 1);
    return ordered;
  }
  if (!rank || rank < 1 || rank > 3) throw new Error('Choose Priority 1, 2, or 3.');
  const index = rank - 1;
  if (operation === 'move') {
    if (oldIndex < 0 || index >= ordered.length) throw new Error('Choose an assigned priority.');
    [ordered[oldIndex], ordered[index]] = [ordered[index], ordered[oldIndex]];
    return ordered;
  }
  if (oldIndex >= 0) throw new Error('This task is already a priority.');
  if (operation === 'assign') {
    if (index !== ordered.length || ordered.length >= 3)
      throw new Error('Choose an empty priority slot.');
    ordered.push(taskId);
    return ordered;
  }
  if (index >= ordered.length) throw new Error('Choose an occupied priority to replace.');
  ordered[index] = taskId;
  return ordered;
}
