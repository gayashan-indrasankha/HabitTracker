import Link from 'next/link';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getBlocksForRange, getGoals, getProjects, getTasks } from '@/lib/dal/life';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';
import { weekStart } from '@/lib/analytics/habit-month-progress';
import { addCalendarDays, expandBlocks } from '@/lib/planning/time-blocks';
import {
  createBlockAction,
  createTaskAction,
  editBlockAction,
  planUnscheduledTaskAction,
  previewBlockEditAction,
  updateBlockStatusAction,
  updateOccurrenceAction,
  updateTaskAction,
} from '@/lib/actions/life-actions';
import { ActionForm } from '@/components/life/action-form';
import { WeekdaySelector } from '@/components/life/weekday-selector';
import { AdjustOccurrence } from '@/components/life/adjust-occurrence';
import { WorkloadSummary } from '@/components/life/workload-summary';
import { TimeOffPlanner } from '@/components/life/time-off-planner';
import { OptionalGym } from '@/components/life/optional-gym';
import { taskSessionLinks, weeklyWorkload } from '@/lib/planning/workload';
import { gymWeekSummary } from '@/lib/planning/gym-summary';
import { getHistoricalHabitsByUser } from '@/lib/dal/habits';
import { getEntriesByUserAndDateRange } from '@/lib/dal/habit-entries';
import { db } from '@/lib/db';
import { timeBlockExceptions, timeOffDays } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logSessionMinutesAction } from '@/lib/actions/planning-actions';
import { ruleOn } from '@/lib/planning/time-blocks';

export const metadata = { title: 'Week | LifeOS' };

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const today = toDateString(getTodayInTimezone(settings.timezone));
  const requested = (await searchParams).date;
  const focused = requested && z.iso.date().safeParse(requested).success ? requested : today;
  const start = weekStart(focused, settings.weekStartsOn);
  const end = addCalendarDays(start, 6);
  const dates = Array.from({ length: 7 }, (_, i) => addCalendarDays(start, i));
  const [data, tasks, goals, projects, timeOff, allExceptions, gymHabits, gymEntries] =
    await Promise.all([
      getBlocksForRange(user.id, start, end),
      getTasks(user.id),
      getGoals(user.id),
      getProjects(user.id),
      db.select().from(timeOffDays).where(eq(timeOffDays.userId, user.id)),
      db.select().from(timeBlockExceptions).where(eq(timeBlockExceptions.userId, user.id)),
      getHistoricalHabitsByUser(user.id),
      getEntriesByUserAndDateRange(user.id, start, end),
    ]);
  const occurrences = expandBlocks(data.rules, data.exceptions, start, end, data.revisions);
  const links = taskSessionLinks(tasks, data.rules, data.revisions, allExceptions);
  const gym = gymWeekSummary(
    dates,
    occurrences,
    gymEntries,
    new Set(gymHabits.filter((habit) => habit.templateKey === 'gym-4').map((habit) => habit.id)),
  );
  const workload = weeklyWorkload(
    dates,
    occurrences,
    tasks,
    data.exceptions,
    timeOff,
    settings.flexibleCapacityMinutes,
    links,
  );
  const weekTasks = tasks.filter(
    (task) =>
      task.scheduledDate &&
      task.scheduledDate >= start &&
      task.scheduledDate <= end &&
      task.status !== 'cancelled',
  );
  const completedTasks = weekTasks.filter((task) => task.status === 'done').length;
  const unplannedTasks = tasks.filter(
    (task) => !task.scheduledDate && ['todo', 'in_progress'].includes(task.status),
  );
  const dateLabel = (date: string) =>
    new Intl.DateTimeFormat('en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
  const fullDateLabel = (date: string) =>
    new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your week</h1>
          <p className="text-sm text-muted-foreground">
            {fullDateLabel(start)} – {fullDateLabel(end)}
          </p>
        </div>
        <nav aria-label="Weeks" className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/week?date=${addCalendarDays(start, -7)}`}
            className="rounded-lg border px-3 py-2"
          >
            Previous week
          </Link>
          <Link href="/week" className="rounded-lg border px-3 py-2">
            This week
          </Link>
          <Link
            href={`/week?date=${addCalendarDays(start, 7)}`}
            className="rounded-lg border px-3 py-2"
          >
            Next week
          </Link>
        </nav>
      </header>
      <section className="rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Start with your tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a day for each task, then do it whenever it suits you. No time slots needed.
            </p>
          </div>
          <p className="rounded-full bg-background px-3 py-1 text-sm font-medium">
            {weekTasks.length
              ? `${completedTasks} of ${weekTasks.length} done`
              : 'No tasks planned yet'}
          </p>
        </div>
        <ActionForm
          key={`new-task-${weekTasks.length}`}
          action={createTaskAction}
          submitLabel="Add task"
          showSuccess={false}
          className="mt-5 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="area" value="Personal Development" />
          <input type="hidden" name="priority" value="2" />
          <label className="min-w-48 flex-1 text-sm font-medium">
            Task
            <input
              name="title"
              required
              maxLength={160}
              placeholder="What do you want to do?"
              className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3"
            />
          </label>
          <label className="text-sm font-medium">
            Day
            <input
              type="date"
              name="scheduledDate"
              required
              min={start}
              max={end}
              defaultValue={focused}
              className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3"
            />
          </label>
        </ActionForm>
        {unplannedTasks.length > 0 && (
          <details
            key={`unplanned-${unplannedTasks.length}`}
            className="mt-4 border-t border-primary/15 pt-3"
          >
            <summary className="cursor-pointer text-sm font-medium text-primary">
              Plan an existing task ({unplannedTasks.length})
            </summary>
            <ActionForm
              action={planUnscheduledTaskAction}
              submitLabel="Add to week"
              showSuccess={false}
              className="mt-3 flex flex-wrap items-end gap-3"
            >
              <label className="min-w-48 flex-1 text-sm font-medium">
                Task
                <select
                  name="id"
                  required
                  defaultValue=""
                  className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3"
                >
                  <option value="" disabled>
                    Choose a task
                  </option>
                  {unplannedTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Day
                <input
                  type="date"
                  name="date"
                  required
                  min={start}
                  max={end}
                  defaultValue={focused}
                  className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3"
                />
              </label>
            </ActionForm>
          </details>
        )}
      </section>
      <section aria-label="Tasks by day" className="space-y-3">
        {dates.map((date) => {
          const dayTasks = weekTasks
            .filter((task) => task.scheduledDate === date)
            .sort((a, b) => {
              if (a.status === 'done' && b.status !== 'done') return 1;
              if (b.status === 'done' && a.status !== 'done') return -1;
              return (a.dailyPriority ?? 9) - (b.dailyPriority ?? 9);
            });
          const dayDone = dayTasks.filter((task) => task.status === 'done').length;
          return (
            <div
              key={date}
              className={`rounded-2xl border bg-card p-4 sm:p-5 ${date === today ? 'border-primary/40 ring-1 ring-primary/10' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">
                  {dateLabel(date)}
                  {date === today && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      Today
                    </span>
                  )}
                </h2>
                {dayTasks.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {dayDone} of {dayTasks.length} done
                  </span>
                )}
              </div>
              {dayTasks.length ? (
                <ul className="mt-3 space-y-2">
                  {dayTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p
                          className={`font-medium ${task.status === 'done' ? 'text-muted-foreground line-through' : ''}`}
                        >
                          {task.title}
                        </p>
                        {task.area !== 'Personal Development' && (
                          <p className="text-xs text-muted-foreground">{task.area}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <details className="text-sm">
                          <summary className="cursor-pointer font-medium text-primary">
                            Change day
                          </summary>
                          <ActionForm
                            action={updateTaskAction}
                            submitLabel="Save day"
                            showSuccess={false}
                            className="mt-2 flex flex-wrap items-end gap-2"
                          >
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="status" value={task.status} />
                            <label className="text-xs">
                              New day
                              <input
                                type="date"
                                name="scheduledDate"
                                required
                                min={start}
                                max={end}
                                defaultValue={date}
                                className="mt-1 min-h-10 rounded-lg border bg-background px-2"
                              />
                            </label>
                          </ActionForm>
                        </details>
                        <ActionForm
                          action={updateTaskAction}
                          submitLabel={task.status === 'done' ? 'Reopen' : 'Mark done'}
                          buttonVariant="secondary"
                          showSuccess={false}
                        >
                          <input type="hidden" name="id" value={task.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={task.status === 'done' ? 'todo' : 'done'}
                          />
                        </ActionForm>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Nothing planned.</p>
              )}
            </div>
          );
        })}
      </section>
      <details className="rounded-2xl border bg-card p-4 sm:p-5">
        <summary className="cursor-pointer font-semibold text-primary">
          Time blocks and detailed planning (optional)
        </summary>
        <p className="mt-2 text-sm text-muted-foreground">
          Your existing sessions, workload details, and schedule settings are here if you need them.
        </p>
        <div className="mt-5 space-y-6">
          <WorkloadSummary
            workload={workload}
            capacity={settings.flexibleCapacityMinutes}
            dateLabel={dateLabel}
          />
          <section aria-label="Weekly training" className="rounded-2xl border bg-card p-4">
            <h2 className="font-semibold">Weekly training</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {gym.completedMain} of {gym.plannedMain} main sessions completed ·{' '}
              {gym.optionalCompleted} optional gym visits ({gym.techniqueCompleted} technique) ·{' '}
              {gym.habitOnlyCompleted} habit-only visits · {gym.totalRecordedVisits} total recorded
              gym visits · {gym.restRecoveryDays} rest/recovery days.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              A gym habit check on the same day as a completed session counts as one visit.{' '}
              {gym.mobilityCompleted} mobility/recovery session(s) are recorded separately from gym
              visits.
            </p>
          </section>
          <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {dates.map((date) => (
              <section
                id={`day-${date}`}
                key={date}
                className="min-w-0 rounded-2xl border bg-card p-3"
              >
                <h2 className="mb-3 border-b pb-2 text-sm font-bold">{dateLabel(date)}</h2>
                <div className="space-y-2">
                  {occurrences
                    .filter((item) => item.date === date)
                    .map((block) => (
                      <article
                        key={`${block.id}:${block.originalDate}`}
                        className={`rounded-xl border-l-4 p-3 text-xs ${block.occurrenceStatus === 'skipped' ? 'border-l-amber-500 bg-amber-500/10' : block.isFixed ? 'border-l-primary bg-primary/5' : 'border-l-sky-400 bg-muted/40'}`}
                      >
                        <p className="font-semibold">
                          {block.localStartTime}–{block.localEndTime}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold">{block.title}</h3>
                        <p className="text-muted-foreground">
                          {block.category} · {block.occurrenceStatus}
                          {block.isFixed ? ' · Fixed' : ''}
                        </p>
                        {['skipped', 'excused'].includes(block.occurrenceStatus) && (
                          <p className="mt-1 text-muted-foreground">
                            Original date: {block.originalDate}
                            {block.reason ? ` · Reason: ${block.reason}` : ''}
                          </p>
                        )}
                        <div className="mt-2 space-y-2">
                          {['skipped', 'excused'].includes(block.occurrenceStatus) ? (
                            <ActionForm action={updateOccurrenceAction} submitLabel="Restore">
                              <input type="hidden" name="blockId" value={block.id} />
                              <input
                                type="hidden"
                                name="occurrenceDate"
                                value={block.originalDate}
                              />
                              <input type="hidden" name="status" value="planned" />
                            </ActionForm>
                          ) : (
                            <ActionForm action={updateOccurrenceAction} submitLabel="Complete">
                              <input type="hidden" name="blockId" value={block.id} />
                              <input
                                type="hidden"
                                name="occurrenceDate"
                                value={block.originalDate}
                              />
                              <input type="hidden" name="status" value="completed" />
                              {block.taskId && (
                                <label className="flex items-center gap-2 text-xs">
                                  <input type="checkbox" name="completeLinkedTask" value="yes" />
                                  This session finished the linked task too
                                </label>
                              )}
                            </ActionForm>
                          )}
                          {!block.isFixed &&
                            !['skipped', 'excused'].includes(block.occurrenceStatus) && (
                              <details>
                                <summary className="cursor-pointer text-primary">
                                  Change occurrence
                                </summary>
                                <ActionForm
                                  action={updateOccurrenceAction}
                                  submitLabel="Skip"
                                  className="mt-2 space-y-1"
                                >
                                  <input type="hidden" name="blockId" value={block.id} />
                                  <input
                                    type="hidden"
                                    name="occurrenceDate"
                                    value={block.originalDate}
                                  />
                                  <input type="hidden" name="status" value="skipped" />
                                  <label className="block">
                                    Reason{' '}
                                    <input
                                      name="reason"
                                      maxLength={500}
                                      className="mt-1 w-full rounded-lg border bg-background p-2"
                                    />
                                  </label>
                                </ActionForm>
                                <ActionForm
                                  action={updateOccurrenceAction}
                                  submitLabel="Move"
                                  className="mt-2 space-y-1"
                                >
                                  <input type="hidden" name="blockId" value={block.id} />
                                  <input
                                    type="hidden"
                                    name="occurrenceDate"
                                    value={block.originalDate}
                                  />
                                  <input type="hidden" name="status" value="rescheduled" />
                                  <label className="block">
                                    Date{' '}
                                    <input
                                      type="date"
                                      name="overrideDate"
                                      required
                                      className="mt-1 w-full rounded-lg border bg-background p-2"
                                    />
                                  </label>
                                  <label className="block">
                                    Start{' '}
                                    <input
                                      type="time"
                                      name="overrideStartTime"
                                      defaultValue={block.localStartTime}
                                      className="mt-1 w-full rounded-lg border bg-background p-2"
                                    />
                                  </label>
                                  <label className="block">
                                    End{' '}
                                    <input
                                      type="time"
                                      name="overrideEndTime"
                                      defaultValue={block.localEndTime}
                                      className="mt-1 w-full rounded-lg border bg-background p-2"
                                    />
                                  </label>
                                </ActionForm>
                              </details>
                            )}
                          <AdjustOccurrence
                            block={block}
                            originalTime={(() => {
                              const original = ruleOn(
                                data.rules.find((item) => item.id === block.id)!,
                                data.revisions,
                                block.originalDate,
                              );
                              return { start: original.localStartTime, end: original.localEndTime };
                            })()}
                          />
                          {block.occurrenceStatus === 'completed' && (
                            <ActionForm
                              action={logSessionMinutesAction}
                              submitLabel="Log actual minutes"
                              className="mt-2 space-y-2"
                            >
                              <input type="hidden" name="blockId" value={block.id} />
                              <input
                                type="hidden"
                                name="occurrenceDate"
                                value={block.originalDate}
                              />
                              <label className="block text-xs">
                                Actual minutes
                                <input
                                  type="number"
                                  name="minutes"
                                  min="0"
                                  max="1440"
                                  required
                                  defaultValue={
                                    data.exceptions.find(
                                      (item) =>
                                        item.blockId === block.id &&
                                        item.occurrenceDate === block.originalDate,
                                    )?.actualMinutes ?? ''
                                  }
                                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                                />
                              </label>
                            </ActionForm>
                          )}
                        </div>
                      </article>
                    ))}
                  {!occurrences.some((item) => item.date === date) && (
                    <p className="text-xs text-muted-foreground">No blocks planned.</p>
                  )}
                </div>
              </section>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <TimeOffPlanner initialDate={focused} plans={timeOff} />
            <OptionalGym
              block={
                data.rules.find((item) => item.templateKey === 'optional-gym-5')
                  ? ruleOn(
                      data.rules.find((item) => item.templateKey === 'optional-gym-5')!,
                      data.revisions,
                      today,
                    )
                  : null
              }
              today={today}
            />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="text-xl font-bold">Add a time block</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Monday is the first mask digit. Select One-off to use only the start date.
              </p>
              <ActionForm
                action={createBlockAction}
                submitLabel="Add block"
                className="grid gap-3 sm:grid-cols-2"
              >
                <label className="text-sm">
                  Title{' '}
                  <input
                    name="title"
                    required
                    maxLength={160}
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  />
                </label>
                <label className="text-sm">
                  Life area{' '}
                  <input
                    name="category"
                    required
                    defaultValue="University"
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  />
                </label>
                <label className="text-sm">
                  Start time{' '}
                  <input
                    type="time"
                    name="localStartTime"
                    required
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  />
                </label>
                <label className="text-sm">
                  End time{' '}
                  <input
                    type="time"
                    name="localEndTime"
                    required
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  />
                </label>
                <WeekdaySelector mask="1111100" />
                <label className="text-sm">
                  Linked task{' '}
                  <select
                    name="taskId"
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="">None</option>
                    {tasks
                      .filter((item) => item.status !== 'done')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-sm">
                  Starts{' '}
                  <input
                    type="date"
                    name="startDate"
                    required
                    defaultValue={start}
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  />
                </label>
                <label className="text-sm">
                  Ends (optional){' '}
                  <input
                    type="date"
                    name="endDate"
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  />
                </label>
                <label className="text-sm">
                  Linked goal{' '}
                  <select
                    name="goalId"
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="">None</option>
                    {goals.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Linked project{' '}
                  <select
                    name="projectId"
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="">None</option>
                    {projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="oneOff" /> One-off on start date
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isFixed" /> Fixed commitment
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="allowOverlap" /> Allow flexible overlap
                </label>
              </ActionForm>
            </section>
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="text-xl font-bold">Recurring blocks</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Edit details, or pause/archive a series without deleting its history.
              </p>
              <ul className="space-y-2">
                {data.rules.map((block) => (
                  <li key={block.id} className="rounded-xl border p-3 text-sm">
                    <p className="font-semibold">{block.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {block.localStartTime}–{block.localEndTime} · {block.weekdayMask} ·{' '}
                      {block.status}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(['active', 'paused', 'archived'] as const)
                        .filter((status) => status !== block.status)
                        .map((status) => (
                          <ActionForm
                            key={status}
                            action={updateBlockStatusAction}
                            submitLabel={status}
                          >
                            <input type="hidden" name="id" value={block.id} />
                            <input type="hidden" name="status" value={status} />
                            <label className="block text-xs">
                              Effective date
                              <input
                                type="date"
                                name="effectiveDate"
                                min={today}
                                defaultValue={today}
                                required
                                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                              />
                            </label>
                            {block.isFixed && (
                              <label className="flex items-center gap-2 text-xs">
                                <input type="checkbox" name="confirmFixed" /> Confirm change to this
                                fixed commitment
                              </label>
                            )}
                          </ActionForm>
                        ))}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-primary">Edit series details</summary>
                      <ActionForm
                        action={editBlockAction}
                        previewAction={previewBlockEditAction}
                        submitLabel="Save block"
                        className="mt-2 grid gap-2 sm:grid-cols-2"
                      >
                        <input type="hidden" name="id" value={block.id} />
                        <label className="sm:col-span-2">
                          Effective date
                          <input
                            type="date"
                            name="effectiveDate"
                            min={today}
                            defaultValue={today}
                            required
                            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                          />
                        </label>
                        <label>
                          Title
                          <input
                            name="title"
                            defaultValue={block.title}
                            required
                            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                          />
                        </label>
                        <label>
                          Area
                          <input
                            name="category"
                            defaultValue={block.category}
                            required
                            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                          />
                        </label>
                        <label>
                          Start
                          <input
                            type="time"
                            name="localStartTime"
                            defaultValue={block.localStartTime}
                            required
                            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                          />
                        </label>
                        <label>
                          End
                          <input
                            type="time"
                            name="localEndTime"
                            defaultValue={block.localEndTime}
                            required
                            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                          />
                        </label>
                        <WeekdaySelector mask={block.weekdayMask} />
                        <label>
                          End date (optional)
                          <input
                            type="date"
                            name="endDate"
                            defaultValue={block.endDate ?? ''}
                            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                          />
                        </label>
                        <label>
                          Linked task
                          <select
                            name="taskId"
                            defaultValue={block.taskId ?? ''}
                            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                          >
                            <option value="">None</option>
                            {tasks.map((task) => (
                              <option key={task.id} value={task.id}>
                                {task.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Linked goal
                          <select
                            name="goalId"
                            defaultValue={block.goalId ?? ''}
                            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                          >
                            <option value="">None</option>
                            {goals.map((goal) => (
                              <option key={goal.id} value={goal.id}>
                                {goal.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Linked project
                          <select
                            name="projectId"
                            defaultValue={block.projectId ?? ''}
                            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                          >
                            <option value="">None</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name="isFixed" defaultChecked={block.isFixed} />{' '}
                          Fixed commitment
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name="confirmFixed" /> Confirm fixed commitment
                          changes
                        </label>
                        <p className="sm:col-span-2 text-xs text-muted-foreground">
                          This and future occurrences: title, area, times, weekdays, end date,
                          links, and fixed setting take effect on the chosen date. Earlier sessions
                          and their statuses stay recorded.
                        </p>
                        <label className="flex items-center gap-2 sm:col-span-2">
                          <input type="checkbox" name="allowOverlap" /> Allow flexible overlap
                        </label>
                      </ActionForm>
                    </details>
                  </li>
                ))}
                {!data.rules.length && (
                  <li className="text-sm text-muted-foreground">No recurring blocks yet.</li>
                )}
              </ul>
            </section>
          </div>
        </div>
      </details>
    </div>
  );
}
