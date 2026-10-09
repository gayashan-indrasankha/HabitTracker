import Link from 'next/link';
import { z } from 'zod';
import { format } from 'date-fns';
import { requireUser } from '@/lib/auth/session';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTasks, getDayPlan, getBlocksForRange, getProjects } from '@/lib/dal/life';
import { getActiveHabitsByUser } from '@/lib/dal/habits';
import { getEntriesByUserAndDateRange } from '@/lib/dal/habit-entries';
import { getNoteByUserAndDate } from '@/lib/dal/notes';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';
import {
  isFlexibleHabitOn,
  isFixedOccurrence,
  weekStart,
  weeklyQuotaAttainment,
} from '@/lib/analytics/habit-month-progress';
import { addCalendarDays, expandBlocks } from '@/lib/planning/time-blocks';
import { setDayModeAction, updateOccurrenceAction } from '@/lib/actions/life-actions';
import { ActionForm } from '@/components/life/action-form';
import { PriorityPanel } from '@/components/life/priority-panel';
import { saveMinimumAction } from '@/lib/actions/planning-actions';
import { TodayHabit } from '@/components/life/today-habit';
import { DailyNoteEditor } from '@/components/notes/daily-note-editor';
import { MealChecklist } from '@/components/nutrition/meal-checklist';
import { getMealLogs, getMealTemplates } from '@/lib/dal/nutrition';
import { mealWeekSummary, type MealStatus } from '@/lib/nutrition/summary';
import { and, asc, eq, lte, notInArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { internshipApplications, subjectTopics } from '@/lib/db/schema';

export const metadata = { title: 'Today | HabitFlow' };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ mealDate?: string }>;
}) {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const now = getTodayInTimezone(settings.timezone);
  const date = toDateString(now);
  const requestedMealDate = (await searchParams).mealDate;
  const mealDate =
    requestedMealDate &&
    z.iso.date().safeParse(requestedMealDate).success &&
    requestedMealDate <= date
      ? requestedMealDate
      : date;
  const mealWeekStart = weekStart(mealDate, settings.weekStartsOn);
  const start = weekStart(date, settings.weekStartsOn);
  const [
    allTasks,
    dayPlan,
    blockData,
    habits,
    entries,
    note,
    projects,
    followUps,
    revisionsDue,
    meals,
    mealLogs,
  ] = await Promise.all([
    getTasks(user.id),
    getDayPlan(user.id, date),
    getBlocksForRange(user.id, date, date),
    getActiveHabitsByUser(user.id),
    getEntriesByUserAndDateRange(user.id, start, addCalendarDays(start, 6)),
    getNoteByUserAndDate(user.id, date),
    getProjects(user.id),
    db
      .select()
      .from(internshipApplications)
      .where(
        and(
          eq(internshipApplications.userId, user.id),
          lte(internshipApplications.followUpDate, date),
          notInArray(internshipApplications.stage, ['saved', 'rejected', 'withdrawn', 'offer']),
        ),
      )
      .orderBy(asc(internshipApplications.followUpDate))
      .limit(1),
    db
      .select()
      .from(subjectTopics)
      .where(and(eq(subjectTopics.userId, user.id), lte(subjectTopics.nextRevisionDate, date)))
      .orderBy(asc(subjectTopics.nextRevisionDate))
      .limit(1),
    getMealTemplates(user.id),
    getMealLogs(user.id, mealWeekStart, addCalendarDays(mealWeekStart, 6)),
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
  const backlogChoices = backlog.map((task) => ({
    id: task.id,
    title: task.title,
    area: task.area,
    projectId: task.projectId,
    projectName: projects.find((project) => project.id === task.projectId)?.name ?? null,
    dueDate: task.dueDate,
    scheduledDate: task.scheduledDate,
  }));
  const occurrences = expandBlocks(
    blockData.rules,
    blockData.exceptions,
    date,
    date,
    blockData.revisions,
  );
  const visibleBlocks =
    mode === 'normal'
      ? occurrences
      : occurrences
          .filter((item) => item.isFixed)
          .concat(occurrences.filter((item) => !item.isFixed).slice(0, mode === 'reduced' ? 2 : 1));
  const hiddenBlocks = occurrences.filter(
    (item) =>
      !visibleBlocks.some(
        (visible) => visible.id === item.id && visible.originalDate === item.originalDate,
      ),
  );
  const urgentTasks = allTasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate <= addCalendarDays(date, 1) &&
      !['done', 'cancelled'].includes(task.status),
  );
  const completionSet = new Set(
    entries.filter((item) => item.completed).map((item) => `${item.habitId}:${item.date}`),
  );
  const weekday = now.getDay();
  const fixedHabits = habits.filter((habit) => isFixedOccurrence(habit, date, weekday));
  const weeklyHabits = habits.filter((habit) => isFlexibleHabitOn(habit, date));
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
      {(followUps.length > 0 || revisionsDue.length > 0) && (
        <section className="rounded-2xl border bg-card p-4 text-sm">
          <h2 className="font-semibold">Worth following up</h2>
          <ul className="mt-1 list-inside list-disc">
            {followUps.map((item) => (
              <li key={item.id}>
                <Link href="/goals/evidence#applications" className="text-primary underline">
                  {item.company} follow-up
                </Link>{' '}
                · {item.followUpDate}
              </li>
            ))}
            {revisionsDue.map((item) => (
              <li key={item.id}>
                <Link href="/goals/evidence#university" className="text-primary underline">
                  Revise {item.title}
                </Link>{' '}
                · {item.nextRevisionDate}
              </li>
            ))}
          </ul>
        </section>
      )}
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
        {mode !== 'normal' && (
          <div className="mt-3 rounded-xl border p-3 text-sm">
            <h3 className="font-semibold">Small next action</h3>
            <p className="text-xs text-muted-foreground">
              Choose an optional smaller version of a habit, such as two pages of reading. Recording
              it does not mark the full habit complete.
            </p>
            <ActionForm
              action={saveMinimumAction}
              submitLabel="Save small action"
              className="mt-2 grid gap-2 sm:grid-cols-2"
            >
              <input type="hidden" name="date" value={date} />
              <label>
                Habit (optional)
                <select
                  name="habitId"
                  defaultValue={dayPlan?.minimumHabitId ?? ''}
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                >
                  <option value="">General action</option>
                  {habits.map((habit) => (
                    <option key={habit.id} value={habit.id}>
                      {habit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Small action
                <input
                  name="action"
                  maxLength={160}
                  defaultValue={dayPlan?.minimumAction ?? ''}
                  placeholder="Read two pages"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="done"
                  value="yes"
                  defaultChecked={dayPlan?.minimumActionDone ?? false}
                />{' '}
                I did this smaller action
              </label>
            </ActionForm>
            {dayPlan?.minimumActionDone && (
              <p className="mt-2 text-emerald-700 dark:text-emerald-300">
                Smaller action recorded. Full habit completion remains separate.
              </p>
            )}
          </div>
        )}
        {mode !== 'normal' && urgentTasks.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-500/50 p-3 text-sm">
            <h3 className="font-semibold">Due today or tomorrow</h3>
            <ul className="mt-1 list-inside list-disc">
              {urgentTasks.map((task) => (
                <li key={task.id}>
                  <Link href={`/goals#task-${task.id}`} className="text-primary underline">
                    {task.title}
                  </Link>{' '}
                  · {task.dueDate}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <PriorityPanel date={date} mode={mode} selected={selected} choices={backlogChoices} />
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
                        {block.occurrenceStatus === 'skipped' ? (
                          <ActionForm action={updateOccurrenceAction} submitLabel="Restore">
                            <input type="hidden" name="blockId" value={block.id} />
                            <input type="hidden" name="occurrenceDate" value={block.originalDate} />
                            <input type="hidden" name="status" value="planned" />
                          </ActionForm>
                        ) : (
                          (['started', 'completed'] as const).map((status) => (
                            <ActionForm
                              key={status}
                              action={updateOccurrenceAction}
                              submitLabel={status === 'started' ? 'Start' : 'Complete'}
                            >
                              <input type="hidden" name="blockId" value={block.id} />
                              <input
                                type="hidden"
                                name="occurrenceDate"
                                value={block.originalDate}
                              />
                              <input type="hidden" name="status" value={status} />
                            </ActionForm>
                          ))
                        )}
                      </div>
                    </div>
                    {!block.isFixed && block.occurrenceStatus !== 'skipped' && (
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
            {mode !== 'normal' && hiddenBlocks.length > 0 && (
              <details className="mt-3 rounded-xl border p-3 text-sm">
                <summary className="min-h-10 cursor-pointer py-2 font-semibold text-primary">
                  Show full schedule ({hiddenBlocks.length} de-emphasized)
                </summary>
                <ul className="mt-2 space-y-1">
                  {hiddenBlocks.map((block) => (
                    <li key={`${block.id}:${block.originalDate}`}>
                      {block.localStartTime}–{block.localEndTime} · {block.title} ·{' '}
                      {block.occurrenceStatus}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  These sessions remain planned. Use Week to adjust them explicitly.
                </p>
                <Link href="/week" className="text-primary underline">
                  Open week
                </Link>
              </details>
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
          {settings.nutritionEnabled && (
            <MealChecklist
              key={mealDate}
              date={mealDate}
              today={date}
              meals={meals.filter(
                (meal) =>
                  meal.active ||
                  mealLogs.some((log) => log.mealId === meal.id && log.date === mealDate),
              )}
              initialStatuses={Object.fromEntries(
                mealLogs
                  .filter((log) => log.date === mealDate)
                  .map((log) => [log.mealId, log.status as MealStatus]),
              )}
              summary={mealWeekSummary(
                mealLogs.map((log) => ({ date: log.date, status: log.status as MealStatus })),
                mealWeekStart,
                date,
              )}
            />
          )}
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
