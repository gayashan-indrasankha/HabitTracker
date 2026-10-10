import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  remove: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => ({ id: 'user-1' }) }));
vi.mock('@/lib/dal/habits', () => ({
  getHabitByIdAndUser: async () => ({ id: 'habit-1', archived: false }),
}));
vi.mock('@/lib/dal/user-settings', () => ({
  getUserSettings: async () => ({ timezone: 'Asia/Colombo' }),
}));
vi.mock('@/lib/dal/habit-entries', () => ({
  upsertHabitEntry: mocks.upsert,
  deleteHabitEntry: mocks.remove,
}));
vi.mock('@/lib/analytics/habit-month-progress', () => ({ isGridApplicable: () => true }));

import { toggleEntryAction } from '@/lib/actions/entry-actions';

function entryForm(date: string, completed: boolean): FormData {
  const form = new FormData();
  form.set('habitId', '00000000-0000-4000-8000-000000000001');
  form.set('date', date);
  form.set('completed', String(completed));
  return form;
}

describe('habit day lock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // One second after midnight in Asia/Colombo, while UTC is still October 9.
    vi.setSystemTime(new Date('2026-10-09T18:30:01Z'));
    mocks.upsert.mockReset();
    mocks.remove.mockReset();
    mocks.revalidate.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it.each([true, false])('rejects changing yesterday when completed=%s', async (completed) => {
    const result = await toggleEntryAction({}, entryForm('2026-10-09', completed));
    expect(result.error).toMatch(/Past days are locked/);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('still accepts changes for today', async () => {
    const result = await toggleEntryAction({}, entryForm('2026-10-10', true));
    expect(result).toEqual({ success: true });
    expect(mocks.upsert).toHaveBeenCalledOnce();
  });
});
