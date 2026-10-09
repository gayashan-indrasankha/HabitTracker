import { describe, expect, it } from 'vitest';
import { focusedDayTasks } from '@/lib/planning/today-focus';

describe('Today focus', () => {
  it('shows the next unfinished task when the first task is done', () => {
    const tasks = [
      { id: 'finished', status: 'done' },
      { id: 'next', status: 'todo' },
      { id: 'later', status: 'todo' },
    ];
    expect(focusedDayTasks(tasks, 'minimum').map((task) => task.id)).toEqual(['next']);
    expect(focusedDayTasks(tasks, 'reduced').map((task) => task.id)).toEqual(['next', 'later']);
    expect(focusedDayTasks(tasks, 'normal')).toEqual(tasks);
  });
});
