import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getBlocksForRange, getMetrics, getReview, getTasks } from '@/lib/dal/life';
import { getActiveHabitsByUser } from '@/lib/dal/habits';
import { getEntriesByUserAndDateRange } from '@/lib/dal/habit-entries';
import { getTodayInTimezone, toDateString, toZonedTime } from '@/lib/utils/date';
import { isFixedOccurrence, weekStart } from '@/lib/analytics/habit-month-progress';
import { addCalendarDays, expandBlocks, weekdayIndex } from '@/lib/planning/time-blocks';
import { addMetricAction, saveReviewAction } from '@/lib/actions/life-actions';
import { ActionForm } from '@/components/life/action-form';

const prompts = [
  ['academic', 'Academic progress'],
  ['industry', 'Industry Project progress'],
  ['career', 'Career and portfolio progress'],
  ['interview', 'Interview preparation'],
  ['english', 'English practice'],
  ['fitness', 'Fitness and recovery'],
  ['sleepAttention', 'Sleep and attention'],
  ['obstacles', 'Obstacles'],
  ['nextWins', 'Next week’s three most important wins'],
] as const;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const userId = (await requireUser()).id;
  const settings = await getUserSettings(userId);
  const today = toDateString(getTodayInTimezone(settings.timezone));
  const query = (await searchParams).week;
  const start = weekStart(query && z.iso.date().safeParse(query).success ? query : today, 1);
  const end = addCalendarDays(start, 6);
  const [review, tasks, metrics, blockData, habits, entries] = await Promise.all([
    getReview(userId, start),
    getTasks(userId),
    getMetrics(userId),
    getBlocksForRange(userId, start, end),
    getActiveHabitsByUser(userId),
    getEntriesByUserAndDateRange(userId, start, end),
  ]);
  let answers: Record<string, string> = {};
  try {
    answers = JSON.parse(review?.answers ?? '{}') as Record<string, string>;
  } catch {
    answers = {};
  }
  const occurrences = expandBlocks(blockData.rules, blockData.exceptions, start, end);
  const completedSessions = occurrences.filter(
    (item) => item.occurrenceStatus === 'completed',
  ).length;
  const skippedSessions = blockData.exceptions.filter(
    (item) =>
      item.status === 'skipped' && item.occurrenceDate >= start && item.occurrenceDate <= end,
  ).length;
  const plannedSessions = occurrences.length + skippedSessions;
  const completedTasks = tasks.filter(
    (item) =>
      item.completedAt &&
      toDateString(toZonedTime(item.completedAt, settings.timezone)) >= start &&
      toDateString(toZonedTime(item.completedAt, settings.timezone)) <= end,
  );
  const studyMinutes = completedTasks
    .filter((item) => ['University', 'Industry Project', 'Career'].includes(item.area))
    .reduce((sum, item) => sum + (item.actualMinutes ?? 0), 0);
  const days = Array.from({ length: 7 }, (_, i) => addCalendarDays(start, i)).filter(
    (date) => date <= today,
  );
  const completedSet = new Set(
    entries.filter((item) => item.completed).map((item) => `${item.habitId}:${item.date}`),
  );
  const eligible = habits.flatMap((habit) =>
    days
      .filter((date) => isFixedOccurrence(habit, date, (weekdayIndex(date) + 1) % 7))
      .map((date) => `${habit.id}:${date}`),
  );
  const adhered = eligible.filter((key) => completedSet.has(key)).length;
  const weights = metrics.filter(
    (item) =>
      item.type === 'Body weight' && item.unit === 'kg' && item.date >= start && item.date <= end,
  );
  const weightAverage = weights.length
    ? (weights.reduce((sum, item) => sum + item.value, 0) / weights.length).toFixed(1)
    : null;
  const previousWeights = metrics.filter(item => item.type === 'Body weight' && item.unit === 'kg' && item.date >= addCalendarDays(start, -7) && item.date < start);
  const previousAverage = previousWeights.length ? previousWeights.reduce((sum, item) => sum + item.value, 0) / previousWeights.length : null;
  const weightChange = weightAverage && previousAverage != null ? (Number(weightAverage) - previousAverage).toFixed(1) : null;
  const categories = [...new Set(completedTasks.map((item) => item.area))];
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Weekly review</p>
        <h1 className="text-3xl font-bold tracking-tight">Notice, learn, adjust</h1>
        <p className="text-sm text-muted-foreground">
          Week of {start} · About 15–30 minutes · {review?.completedAt ? 'Completed' : 'Draft'}
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Adherence</h2>
          <p className="text-2xl font-bold">
            {adhered} / {eligible.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Fixed scheduled habit occurrences. Flexible quotas are shown on Today.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Output</h2>
          <p className="text-2xl font-bold">{completedTasks.length} tasks</p>
          <p className="text-xs text-muted-foreground">
            {completedTasks.filter((item) => item.isMilestone).length} milestones · {studyMinutes}{' '}
            recorded study/project minutes · {completedSessions} of {plannedSessions} planned
            sessions completed · {skippedSessions} explicitly skipped. Linked tasks are counted once
            as tasks.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Outcome</h2>
          <p className="text-2xl font-bold">
            {weightAverage ? `${weightAverage} kg` : 'No weight data'}
          </p>
          <p className="text-xs text-muted-foreground">
            {weights.length} recorded weight measurements this week.
            {weightChange != null ? ` ${Number(weightChange) >= 0 ? '+' : ''}${weightChange} kg versus the prior weekly average.` : ' Add another week to see a trend.'} Actual grades remain in Goals.
          </p>
        </div>
      </section>
      {categories.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Finished tasks by life area</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {categories.map((area) => (
              <li key={area} className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                {area}: {completedTasks.filter((item) => item.area === area).length}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-bold">Your reflection</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Recorded activity gives context. Confirm your own interpretation.
        </p>
        <ActionForm action={saveReviewAction} submitLabel="Save review" className="space-y-4">
          <input type="hidden" name="weekStart" value={start} />
          {prompts.map(([key, label]) => (
            <label key={key} className="block text-sm font-medium">
              {label}
              <textarea
                name={key}
                defaultValue={answers[key] ?? ''}
                maxLength={2000}
                rows={key === 'nextWins' ? 3 : 2}
                className="mt-1 w-full rounded-lg border bg-background p-3 font-normal"
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="complete" defaultChecked={Boolean(review?.completedAt)} />{' '}
            Mark this review complete
          </label>
        </ActionForm>
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-bold">Record a measurement</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Use actual measurements only. An unusual reading is information, not a failure.
        </p>
        <ActionForm
          action={addMetricAction}
          submitLabel="Record metric"
          className="grid gap-3 sm:grid-cols-2"
        >
          <label className="text-sm">
            Date
            <input
              type="date"
              name="date"
              required
              defaultValue={today}
              className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            Metric
            <input
              name="type"
              list="metric-types"
              required
              defaultValue="Body weight"
              className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
            />
            <datalist id="metric-types">
              <option value="Body weight" />
              <option value="Focus minutes" />
              <option value="Study minutes" />
              <option value="English practice minutes" />
              <option value="Sleep duration" />
            </datalist>
          </label>
          <label className="text-sm">
            Value
            <input
              type="number"
              name="value"
              min="0"
              max="100000"
              step="any"
              required
              className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            Unit
            <input
              name="unit"
              required
              defaultValue="kg"
              className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Note (optional)
            <input
              name="note"
              maxLength={500}
              className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
            />
          </label>
        </ActionForm>
        {metrics.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Recent measurements</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {metrics.slice(0, 8).map((item) => (
                <li key={item.id}>
                  {item.date}: {item.value} {item.unit} · {item.type}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
