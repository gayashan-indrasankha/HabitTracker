/** Focus unfinished selected tasks so a completed first task does not hide the next one. */
export function focusedDayTasks<T extends { status: string }>(
  tasks: T[],
  mode: 'normal' | 'reduced' | 'minimum',
): T[] {
  if (mode === 'normal') return tasks;
  return tasks
    .filter((task) => !['done', 'cancelled'].includes(task.status))
    .slice(0, mode === 'minimum' ? 1 : 2);
}
