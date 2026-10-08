import Link from 'next/link';
import { format } from 'date-fns';
import { requireUser } from '@/lib/auth/session';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTasks, getDayPlan, getBlocksForRange } from '@/lib/dal/life';
import { getActiveHabitsByUser } from '@/lib/dal/habits';
import { getEntriesByUserAndDateRange } from '@/lib/dal/habit-entries';
import { getNoteByUserAndDate } from '@/lib/dal/notes';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';
import {
  inHabitRange,
  isFlexibleWeekly,
  isFixedOccurrence,
  weekStart,
  weeklyQuotaAttainment,
} from '@/lib/analytics/habit-month-progress';
import { addCalendarDays, expandBlocks } from '@/lib/planning/time-blocks';
import {
  selectPriorityAction,
  setDayModeAction,
  updateOccurrenceAction,
  updateTaskAction,
} from '@/lib/actions/life-actions';
import { ActionForm } from '@/components/life/action-form';
import { TodayHabit } from '@/components/life/today-habit';
import { DailyNoteEditor } from '@/components/notes/daily-note-editor';

export default async function TodayPage() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const now = getTodayInTimezone(settings.timezone);
  const date = toDateString(now);
  const start = weekStart(date, settings.weekStartsOn);
  const [allTasks, dayPlan, blockData, habits, entries, note] = await Promise.all([
    getTasks(user.id),
    getDayPlan(user.id, date),
    getBlocksForRange(user.id, date, date),
    getActiveHabitsByUser(user.id),
    getEntriesByUserAndDateRange(user.id, start, addCalendarDays(start, 6)),
    getNoteByUserAndDate(user.id, date),
  ]);
  const mode = dayPlan?.mode ?? 'normal';
  const selected = allTasks
    .filter((task) => task.scheduledDate === date && task.dailyPriority)
    .sort((a, b) => (a.dailyPriority ?? 9) - (b.dailyPriority ?? 9))
    .slice(0, 3);
  const visiblePriorities =
    mode === 'minimum'
      ? selected.slice(0, 1)
      : mode === 'reduced'
        ? selected.slice(0, 2)
        : selected;
  const backlog = allTasks.filter(
    (task) =>
      task.status !== 'done' &&
      task.status !== 'cancelled' &&
      !selected.some((item) => item.id === task.id),
  );
  const occurrences = expandBlocks(blockData.rules, blockData.exceptions, date, date);
  const visibleBlocks =
    mode === 'normal'
      ? occurrences
      : occurrences
          .filter((item) => item.isFixed)
          .concat(occurrences.filter((item) => !item.isFixed).slice(0, mode === 'reduced' ? 2 : 1));
  const completionSet = new Set(
    entries.filter((item) => item.completed).map((item) => `${item.habitId}:${item.date}`),
  );
  const weekday = now.getDay();
  const fixedHabits = habits.filter((habit) => isFixedOccurrence(habit, date, weekday));
  const weeklyHabits = habits.filter(
    (habit) => isFlexibleWeekly(habit.schedule) && inHabitRange(habit, date),
  );
  const done = selected.filter((task) => task.status === 'done').length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Today · {settings.timezone}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Good to see you, {user.name?.split(' ')[0] ?? 'friend'}.
          </h1>
          <p className="text-muted-foreground">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 text-sm">
          <strong>
            {done} of {selected.length}
          </strong>{' '}
          priorities complete
        </div>
      </header>
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Day mode</h2>
            <p className="text-sm text-muted-foreground">
              Change what is shown today. Your history stays as recorded.
            </p>
          </div>
          <ActionForm
            action={setDayModeAction}
            submitLabel="Update mode"
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="date" value={date} />
            <label className="sr-only" htmlFor="day-mode">
              Day mode
            </label>
            <select
              id="day-mode"
              name="mode"
              defaultValue={mode}
              className="min-h-10 rounded-lg border bg-background px-3"
            >
              <option value="normal">Normal</option>
              <option value="reduced">Reduced</option>
              <option value="minimum">Minimum</option>
            </select>
          </ActionForm>
        </div>
        {mode !== 'normal' && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {selected.length - visiblePriorities.length} selected priorities are hidden in this
              view, not completed or rescheduled.
            </p>
            <ActionForm action={setDayModeAction} submitLabel="Resume normal plan">
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="mode" value="normal" />
            </ActionForm>
          </div>
        )}
        {mode === 'reduced' && (
          <p className="mt-2 text-sm text-muted-foreground">
            Try one 25-minute focus block, then decide whether to continue.
          </p>
        )}
        {mode === 'minimum' && (
          <p className="mt-2 text-sm text-muted-foreground">
            Protect essential commitments, sleep, and recovery. One small next action is enough.
          </p>
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Today’s three wins</h2>
              <Link href="/goals" className="text-sm font-medium text-primary hover:underline">
                Manage tasks
              </Link>
            </div>
            {visiblePriorities.length ? (
              <ol className="space-y-3">
                {visiblePriorities.map((task) => (
                  <li key={task.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {task.area}{' '}
                          {task.estimatedMinutes ? `· ${task.estimatedMinutes} min` : ''}
                        </p>
                        <h3 className="font-semibold">{task.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {task.status.replace('_', ' ')}
                        </p>
                        <Link
                          href={`/goals#task-${task.id}`}
                          className="text-xs font-medium text-primary underline"
                        >
                          Edit task
                        </Link>
                      </div>
                      <ActionForm
                        action={updateTaskAction}
                        submitLabel={task.status === 'done' ? 'Reopen' : 'Complete'}
                        className="flex flex-col gap-1"
                      >
                        <input type="hidden" name="id" value={task.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={task.status === 'done' ? 'todo' : 'done'}
                        />
                      </ActionForm>
                    </div>
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer text-primary">
                        Reschedule or reorder
                      </summary>
                      <ActionForm
                        action={updateTaskAction}
                        submitLabel="Reschedule"
                        className="mt-2 flex flex-wrap items-end gap-2"
                      >
                        <input type="hidden" name="id" value={task.id} />
                        <input type="hidden" name="status" value={task.status} />
                        <label className="text-xs">
                          New date{' '}
                          <input
                            type="date"
                            name="scheduledDate"
                            required
                            defaultValue={date}
                            className="block min-h-10 rounded-lg border bg-background px-2"
                          />
                        </label>
                      </ActionForm>
                      <ActionForm
                        action={selectPriorityAction}
                        submitLabel="Move"
                        className="mt-2 flex items-center gap-2"
                      >
                        <input type="hidden" name="id" value={task.id} />
                        <input type="hidden" name="date" value={date} />
                        <label className="text-xs">
                          Priority{' '}
                          <select
                            name="rank"
                            defaultValue={task.dailyPriority ?? 1}
                            className="ml-2 min-h-10 rounded-lg border bg-background px-2"
                          >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                          </select>
                        </label>
                      </ActionForm>
                    </details>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose up to three tasks from your backlog. A clear next action is enough to begin.
              </p>
            )}
            {selected.length < 3 && backlog.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h3 className="mb-2 text-sm font-semibold">Choose from backlog</h3>
                <div className="space-y-2">
                  {backlog.slice(0, 8).map((task) => (
                    <ActionForm
                      key={task.id}
                      action={selectPriorityAction}
                      submitLabel="Add to today"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm"
                    >
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="date" value={date} />
                      <input type="hidden" name="rank" value={selected.length + 1} />
                      <span>
                        {task.title} <span className="text-muted-foreground">· {task.area}</span>
                      </span>
                    </ActionForm>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Today’s schedule</h2>
              <Link href="/week" className="text-sm font-medium text-primary hover:underline">
                Open week
              </Link>
            </div>
            {visibleBlocks.length ? (
              <ol className="space-y-3">
                {visibleBlocks.map((block) => (
                  <li key={`${block.id}:${block.originalDate}`} className="rounded-xl border p-3">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-primary">
                          {block.localStartTime}–{block.localEndTime} · {block.category}
                        </p>
                        <h3 className="font-semibold">
                          {block.title}{' '}
                          {block.isFixed && (
                            <span className="text-xs text-muted-foreground">· Fixed</span>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground">{block.occurrenceStatus}</p>
                        {block.taskId && (
                          <Link
                            href={`/goals#task-${block.taskId}`}
                            className="text-xs font-medium text-primary underline"
                          >
                            View task
                          </Link>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {(['started', 'completed'] as const).map((status) => (
                          <ActionForm
                            key={status}
                            action={updateOccurrenceAction}
                            submitLabel={status === 'started' ? 'Start' : 'Complete'}
                          >
                            <input type="hidden" name="blockId" value={block.id} />
                            <input type="hidden" name="occurrenceDate" value={block.originalDate} />
                            <input type="hidden" name="status" value={status} />
                          </ActionForm>
                        ))}
                      </div>
                    </div>
                    {!block.isFixed && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-primary">
                          Skip or reschedule
                        </summary>
                        <ActionForm
                          action={updateOccurrenceAction}
                          submitLabel="Skip occurrence"
                          className="mt-2 flex flex-wrap items-end gap-2"
                        >
                          <input type="hidden" name="blockId" value={block.id} />
                          <input type="hidden" name="occurrenceDate" value={block.originalDate} />
                          <input type="hidden" name="status" value="skipped" />
                          <label className="text-xs">
                            Reason (optional){' '}
                            <input
                              name="reason"
                              maxLength={500}
                              className="block min-h-10 rounded-lg border bg-background px-2"
                            />
                          </label>
                        </ActionForm>
                        <ActionForm
                          action={updateOccurrenceAction}
                          submitLabel="Reschedule"
                          className="mt-2 flex flex-wrap items-end gap-2"
                        >
                          <input type="hidden" name="blockId" value={block.id} />
                          <input type="hidden" name="occurrenceDate" value={block.originalDate} />
                          <input type="hidden" name="status" value="rescheduled" />
                          <label className="text-xs">
                            New date{' '}
                            <input
                              type="date"
                              name="overrideDate"
                              required
                              className="block min-h-10 rounded-lg border bg-background px-2"
                            />
                          </label>
                          <label className="text-xs">
                            Start{' '}
                            <input
                              type="time"
                              name="overrideStartTime"
                              defaultValue={block.localStartTime}
                              className="block min-h-10 rounded-lg border bg-background px-2"
                            />
                          </label>
                          <label className="text-xs">
                            End{' '}
                            <input
                              type="time"
                              name="overrideEndTime"
                              defaultValue={block.localEndTime}
                              className="block min-h-10 rounded-lg border bg-background px-2"
                            />
                          </label>
                        </ActionForm>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                No time blocks planned.{' '}
                <Link href="/week" className="text-primary underline">
                  Plan the week
                </Link>{' '}
                when you are ready.
              </p>
            )}
          </section>
        </div>
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-bold">Habits due today</h2>
            <p className="mb-3 text-sm text-muted-foreground">Rest days stay neutral.</p>
            {fixedHabits.length || weeklyHabits.length ? (
              <ul className="space-y-2">
                {fixedHabits.map((habit) => (
                  <TodayHabit
                    key={habit.id}
                    id={habit.id}
                    name={habit.name}
                    date={date}
                    completed={completionSet.has(`${habit.id}:${date}`)}
                  />
                ))}
                {weeklyHabits.map((habit) => {
                  const completed = new Set(
                    entries
                      .filter((item) => item.habitId === habit.id && item.completed)
                      .map((item) => item.date),
                  );
                  const quota = weeklyQuotaAttainment(
                    habit,
                    date,
                    completed,
                    date,
                    settings.weekStartsOn,
                  );
                  return (
                    <TodayHabit
                      key={habit.id}
                      id={habit.id}
                      name={habit.name}
                      date={date}
                      completed={completed.has(date)}
                      detail={`${quota.completed} of ${quota.goal} this week`}
                    />
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No applicable habits today.</p>
            )}
            <Link
              href="/dashboard"
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              Monthly history
            </Link>
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-bold">Evening check-in</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              What worked, what blocked you, and what matters next? Your note stays private.
            </p>
            <DailyNoteEditor date={date} initialContent={note?.content ?? ''} />
          </section>
        </div>
      </div>
    </div>
  );
}
