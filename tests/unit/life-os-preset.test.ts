import { describe, expect, it } from 'vitest';
import { blocks, goals, habits, meals, projects, tasks, topics } from '@/lib/life-os/preset';
import { LIFE_AREAS } from '@/lib/life-areas';

describe('Personal Life OS preset', () => {
  it('uses the current life areas for starter goals and schedule blocks', () => {
    for (const item of [...goals, ...blocks]) expect(LIFE_AREAS).toContain(item.area);
  });

  it('has stable unique keys and valid goal/project relationships', () => {
    for (const group of [goals, projects, tasks, habits, blocks, topics, meals])
      expect(new Set(group.map((item) => item.key)).size).toBe(group.length);
    for (const project of projects)
      expect(goals.some((goal) => goal.key === project.goal)).toBe(true);
    for (const task of tasks) {
      if (task.goal) expect(goals.some((goal) => goal.key === task.goal)).toBe(true);
      if (task.project) expect(projects.some((project) => project.key === task.project)).toBe(true);
    }
    for (const block of blocks) {
      if (block.goal) expect(goals.some((goal) => goal.key === block.goal)).toBe(true);
      if (block.project)
        expect(projects.some((project) => project.key === block.project)).toBe(true);
    }
  });

  it('plans the requested lectures, four gym days, six meals and starter topics', () => {
    expect(blocks.find((item) => item.key === 'lecture-mon')).toMatchObject({
      mask: '1000000',
      start: '08:00',
      end: '18:30',
      fixed: true,
    });
    expect(blocks.find((item) => item.key === 'lecture-tue')).toMatchObject({
      mask: '0100000',
      start: '08:00',
      end: '15:00',
      fixed: true,
    });
    expect(blocks.filter((item) => item.key.startsWith('gym-'))).toHaveLength(4);
    expect(blocks.filter((item) => item.key.startsWith('gym-')).map((item) => item.mask)).toEqual([
      '0100000',
      '0010000',
      '0000100',
      '0000010',
    ]);
    expect(meals).toHaveLength(6);
    expect(topics).toHaveLength(21);
    expect(tasks.filter((item) => item.section === 'english')).toHaveLength(10);
    expect(habits.find((item) => item.key === 'sleep-routine')?.name).toContain('23:00');
  });

  it('does not schedule overlapping new blocks on any weekday', () => {
    for (let day = 0; day < 7; day++) {
      const sessions = blocks
        .filter((item) => item.mask[day] === '1')
        .sort((a, b) => a.start.localeCompare(b.start));
      for (let index = 1; index < sessions.length; index++)
        expect(
          sessions[index - 1].end <= sessions[index].start,
          `${sessions[index - 1].key} and ${sessions[index].key}`,
        ).toBe(true);
    }
  });
});
