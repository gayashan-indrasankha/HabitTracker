import Link from 'next/link';
import { ChevronDown, ListChecks, NotebookPen } from 'lucide-react';
import { z } from 'zod';
import { format } from 'date-fns';
import { requireUser } from '@/lib/auth/session';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTasks, getDayPlan, getProjects } from '@/lib/dal/life';
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
import { addCalendarDays } from '@/lib/planning/time-blocks';
import { focusedDayTasks } from '@/lib/planning/today-focus';
import { PriorityPanel } from '@/components/life/priority-panel';
import { PriorityPicker } from '@/components/life/priority-picker';
import { DayModeControl } from '@/components/life/day-mode-control';
import { TodayHabit } from '@/components/life/today-habit';
import { DailyNoteEditor } from '@/components/notes/daily-note-editor';
import { MealChecklist } from '@/components/nutrition/meal-checklist';
import { getMealLogs, getMealTemplates } from '@/lib/dal/nutrition';
import { mealWeekSummary, type MealStatus } from '@/lib/nutrition/summary';
import { and, asc, eq, lte, notInArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { internshipApplications, subjectTopics } from '@/lib/db/schema';

export const metadata = { title: 'Today | LifeOS' };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ mealDate?: string; finish?: string }>;
}) {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const now = getTodayInTimezone(settings.timezone);
  const date = toDateString(now);
  const tomorrow = addCalendarDays(date, 1);
  const params = await searchParams;
  const requestedMealDate = params.mealDate;
  const showFinish = params.finish === '1';
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
  const mode = dayPlan?.mode === 'minimum' || dayPlan?.mode === 'reduced' ? dayPlan.mode : 'normal';
  const selected = allTasks
    .filter((task) => task.scheduledDate === date && task.dailyPriority)
    .sort((a, b) => (a.dailyPriority ?? 9) - (b.dailyPriority ?? 9))
    .slice(0, 3);
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
  const tomorrowSelected = allTasks
    .filter((task) => task.scheduledDate === tomorrow && task.dailyPriority)
    .sort((a, b) => (a.dailyPriority ?? 9) - (b.dailyPriority ?? 9));
  const tomorrowChoices = allTasks
    .filter(
      (task) =>
        !['done', 'cancelled'].includes(task.status) &&
        !tomorrowSelected.some((item) => item.id === task.id),
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      area: task.area,
      projectId: task.projectId,
      projectName: projects.find((project) => project.id === task.projectId)?.name ?? null,
      dueDate: task.dueDate,
      scheduledDate: task.scheduledDate,
    }));
  const visibleTasks = focusedDayTasks(selected, mode);
  const nextTask = visibleTasks.find((task) => !['done', 'cancelled'].includes(task.status));
  const hasHiddenWork = selected.some(
    (task) => !['done', 'cancelled'].includes(task.status) && !visibleTasks.includes(task),
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
  const habitItems = [...fixedHabits, ...weeklyHabits]
    .map((habit) => {
      const completedDates = new Set(
        entries
          .filter((item) => item.habitId === habit.id && item.completed)
          .map((item) => item.date),
      );
      const isWeekly = weeklyHabits.some((item) => item.id === habit.id);
      const quota = isWeekly
        ? weeklyQuotaAttainment(habit, date, completedDates, date, settings.weekStartsOn)
        : null;
      return {
        habit,
        completed: completionSet.has(`${habit.id}:${date}`),
        detail: quota ? `${quota.completed} of ${quota.goal} this week` : undefined,
      };
    })
    .sort((a, b) => Number(a.completed) - Number(b.completed));
  const canShowLess =
    selected.filter((task) => !['done', 'cancelled'].includes(task.status)).length > 1;
  const done = selected.filter((task) => task.status === 'done').length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{format(now, 'EEEE, MMMM d, yyyy')}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Today</h1>
        </div>
        {selected.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {done} of {selected.length} focus tasks done
          </p>
        )}
      </header>
      <section
        className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5"
        aria-label="Next action"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          {nextTask ? 'Start here' : 'Up next'}
        </p>
        {nextTask ? (
          <div className="mt-2">
            <h2 className="font-semibold">{nextTask.title}</h2>
            <p className="text-sm text-muted-foreground">
              Your priority {nextTask.dailyPriority} · {nextTask.area}
            </p>
          </div>
        ) : habitItems.some((item) => !item.completed) ? (
          <div className="mt-2">
            <div>
              <h2 className="font-semibold">
                {habitItems.find((item) => !item.completed)?.habit.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Check it off in Habits below when you are done.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {selected.length
                ? 'You are caught up with your focus tasks and checklists.'
                : 'Nothing is due right now. Add a focus task if you want one.'}
            </p>
            {selected.length === 0 && (
              <a
                href="#today-priorities"
                className="font-semibold text-primary underline underline-offset-2"
              >
                Choose a task
              </a>
            )}
          </div>
        )}
      </section>
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
      {(canShowLess || mode !== 'normal') && (
        <DayModeControl key={date} date={date} initialMode={mode} hasHiddenWork={hasHiddenWork} />
      )}
      {mode !== 'normal' && urgentTasks.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Due soon:{' '}
          {urgentTasks.map((task, index) => (
            <span key={task.id}>
              {index > 0 ? ', ' : ''}
              <Link href={`/goals#task-${task.id}`} className="text-primary underline">
                {task.title}
              </Link>
            </span>
          ))}
        </p>
      )}
      <div className="space-y-5">
        <div id="today-priorities">
          <PriorityPanel date={date} mode={mode} selected={selected} choices={backlogChoices} />
        </div>
        <div className="space-y-5">
          <section id="today-habits" className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">Habits</h2>
                <p className="text-sm text-muted-foreground">
                  Check off the habits you completed today.
                </p>
              </div>
              {habitItems.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {habitItems.filter((item) => item.completed).length} of {habitItems.length} done
                </span>
              )}
            </div>
            {habitItems.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {habitItems.map(({ habit, completed, detail }) => (
                  <TodayHabit
                    key={habit.id}
                    id={habit.id}
                    name={habit.name}
                    date={date}
                    completed={completed}
                    detail={detail}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No habits to check off today.</p>
            )}
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
          <details
            id="finish-your-day"
            open={showFinish}
            className="group scroll-mt-24 overflow-hidden rounded-2xl border bg-card"
          >
            <summary className="flex min-h-20 cursor-pointer list-none items-center gap-4 p-5 transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-bold tracking-tight">Finish your day</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Journal for a moment, then look at tomorrow
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="space-y-6 border-t px-5 pb-5 pt-6">
              <section aria-labelledby="today-note-heading">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                    <NotebookPen aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 id="today-note-heading" className="font-semibold">
                      Today’s journal
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Write as much or as little as you like. Your entry is private and appears in
                      Journal.
                    </p>
                  </div>
                </div>
                {selected.some((task) => !['done', 'cancelled'].includes(task.status)) && (
                  <p className="mb-4 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                    Still open today:{' '}
                    {selected
                      .filter((task) => !['done', 'cancelled'].includes(task.status))
                      .map((task) => task.title)
                      .join(', ')}
                    . You can keep, finish, or reschedule these in Today’s priorities.
                  </p>
                )}
                <DailyNoteEditor date={date} initialContent={note?.content ?? ''} />
              </section>
              <section aria-labelledby="tomorrow-priorities-heading" className="border-t pt-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                    <ListChecks aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 id="tomorrow-priorities-heading" className="font-semibold">
                      Tomorrow’s priorities
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Choose one useful task for {tomorrow}. Nothing is selected automatically.
                    </p>
                  </div>
                </div>
                {tomorrowSelected.length > 0 && (
                  <ol className="mt-4 space-y-2">
                    {tomorrowSelected.map((task, index) => (
                      <li
                        key={task.id}
                        className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </span>
                        <span className="min-w-0 break-words font-medium">{task.title}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {tomorrowChoices.length > 0 ? (
                  <PriorityPicker
                    date={tomorrow}
                    choices={tomorrowChoices}
                    occupied={[1, 2, 3].map(
                      (rank) =>
                        tomorrowSelected.find((task) => task.dailyPriority === rank)?.title ?? null,
                    )}
                    triggerLabel="Plan tomorrow"
                  />
                ) : (
                  <Link
                    href="/goals"
                    className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-primary underline"
                  >
                    Open tasks
                  </Link>
                )}
              </section>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
