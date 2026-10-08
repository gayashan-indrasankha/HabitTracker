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
  editBlockAction,
  previewBlockEditAction,
  updateBlockStatusAction,
  updateOccurrenceAction,
} from '@/lib/actions/life-actions';
import { ActionForm } from '@/components/life/action-form';
import { WeekdaySelector } from '@/components/life/weekday-selector';
import { AdjustOccurrence } from '@/components/life/adjust-occurrence';
import { WorkloadSummary } from '@/components/life/workload-summary';
import { TimeOffPlanner } from '@/components/life/time-off-planner';
import { OptionalGym } from '@/components/life/optional-gym';
import { weeklyWorkload } from '@/lib/planning/workload';
import { db } from '@/lib/db';
import { timeOffDays } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logSessionMinutesAction } from '@/lib/actions/planning-actions';
import { ruleOn } from '@/lib/planning/time-blocks';

export const metadata = { title: 'Week | HabitFlow' };

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
  const [data, tasks, goals, projects, timeOff] = await Promise.all([
    getBlocksForRange(user.id, start, end),
    getTasks(user.id),
    getGoals(user.id),
    getProjects(user.id),
    db.select().from(timeOffDays).where(eq(timeOffDays.userId, user.id)),
  ]);
  const occurrences = expandBlocks(data.rules, data.exceptions, start, end, data.revisions);
  const workload = weeklyWorkload(
    dates,
    occurrences,
    tasks,
    data.exceptions,
    timeOff,
    settings.flexibleCapacityMinutes,
  );
  const dateLabel = (date: string) =>
    new Intl.DateTimeFormat('en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Weekly planner</p>
          <h1 className="text-3xl font-bold tracking-tight">Plan a realistic week</h1>
          <p className="text-sm text-muted-foreground">
            {dateLabel(start)} – {dateLabel(end)} · {settings.timezone}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/week?date=${addCalendarDays(start, -7)}`}
            className="rounded-lg border px-3 py-2"
          >
            Previous
          </Link>
          <Link href="/week" className="rounded-lg border px-3 py-2">
            Current
          </Link>
          <Link
            href={`/week?date=${addCalendarDays(start, 7)}`}
            className="rounded-lg border px-3 py-2"
          >
            Next
          </Link>
        </div>
      </header>
      <WorkloadSummary
        workload={workload}
        capacity={settings.flexibleCapacityMinutes}
        dateLabel={dateLabel}
      />
      <nav aria-label="Choose day" className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
        {dates.map((date) => (
          <Link
            key={date}
            href={`/week?date=${date}`}
            aria-current={focused === date ? 'date' : undefined}
            className={`min-h-11 shrink-0 rounded-lg border px-3 py-2 text-sm ${focused === date ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
          >
            {dateLabel(date)}
          </Link>
        ))}
      </nav>
      <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
        {dates.map((date) => (
          <section
            id={`day-${date}`}
            key={date}
            className={`${focused === date ? '' : 'hidden xl:block'} min-w-0 scroll-mt-32 rounded-2xl border bg-card p-3 lg:scroll-mt-20`}
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
                          <input type="hidden" name="occurrenceDate" value={block.originalDate} />
                          <input type="hidden" name="status" value="planned" />
                        </ActionForm>
                      ) : (
                        <ActionForm action={updateOccurrenceAction} submitLabel="Complete">
                          <input type="hidden" name="blockId" value={block.id} />
                          <input type="hidden" name="occurrenceDate" value={block.originalDate} />
                          <input type="hidden" name="status" value="completed" />
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
                          <input type="hidden" name="occurrenceDate" value={block.originalDate} />
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
                  {block.localStartTime}–{block.localEndTime} · {block.weekdayMask} · {block.status}
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
                      <input type="checkbox" name="isFixed" defaultChecked={block.isFixed} /> Fixed
                      commitment
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="confirmFixed" /> Confirm fixed commitment changes
                    </label>
                    <p className="sm:col-span-2 text-xs text-muted-foreground">
                      This and future occurrences: title, area, times, weekdays, end date, links,
                      and fixed setting take effect on the chosen date. Earlier sessions and their
                      statuses stay recorded.
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
  );
}
