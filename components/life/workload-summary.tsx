import type { weeklyWorkload } from '@/lib/planning/workload';
import { saveCapacityAction } from '@/lib/actions/planning-actions';
import { ActionForm } from './action-form';

type Workload = ReturnType<typeof weeklyWorkload>;
const hours = (minutes: number) => `${(minutes / 60).toFixed(1)}h`;

export function WorkloadSummary({
  workload,
  capacity,
  dateLabel,
}: {
  workload: Workload;
  capacity: number | null;
  dateLabel: (date: string) => string;
}) {
  const max = Math.max(60, ...workload.daily.map((day) => day.fixedMinutes + day.flexibleMinutes));
  return (
    <section className="rounded-2xl border bg-card p-5" aria-labelledby="workload-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="workload-title" className="text-xl font-bold">
            Weekly workload
          </h2>
          <p className="text-sm text-muted-foreground">
            Scheduled time and recorded work are separate.
          </p>
        </div>
        <ActionForm
          action={saveCapacityAction}
          submitLabel="Save capacity"
          className="flex flex-wrap items-end gap-2 text-xs"
        >
          <label>
            Daily flexible capacity (minutes)
            <input
              type="number"
              name="capacity"
              min="15"
              max="1440"
              defaultValue={capacity ?? ''}
              placeholder="Optional"
              className="mt-1 min-h-10 w-36 rounded-lg border bg-background px-2"
            />
          </label>
        </ActionForm>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Metric label="Fixed commitments" value={hours(workload.fixedMinutes)} />
        <Metric label="Flexible planned" value={hours(workload.flexibleMinutes)} />
        <Metric label="Completed sessions" value={String(workload.completedSessions)} />
        <Metric
          label="Actual logged work"
          value={workload.actualRecorded ? `${workload.actualMinutes} min` : 'Not recorded'}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {workload.skippedSessions} skipped · {workload.excusedSessions} excused. Linked task
        estimates are counted with their block only.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {workload.daily.map((day) => (
          <div
            key={day.date}
            className={`rounded-xl border p-3 text-xs ${day.overloaded ? 'border-amber-500 bg-amber-500/10' : ''}`}
          >
            <p className="font-semibold">{dateLabel(day.date)}</p>
            <p>Fixed {hours(day.fixedMinutes)}</p>
            <p>Flexible {hours(day.flexibleMinutes)}</p>
            <div className="mt-2 flex h-2 overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${(day.fixedMinutes / max) * 100}%` }}
              />
              <div
                className="h-full bg-sky-400"
                style={{ width: `${(day.flexibleMinutes / max) * 100}%` }}
              />
            </div>
            {day.overloaded && (
              <a
                href={`#day-${day.date}`}
                className="mt-1 block font-semibold text-amber-700 underline dark:text-amber-300"
              >
                Over capacity · adjust
              </a>
            )}
            {day.timeOff.length > 0 && <p className="mt-1">{day.timeOff.join(', ')} time off</p>}
            {day.fixedMinutes + day.flexibleMinutes === 0 && day.timeOff.length === 0 && (
              <p className="mt-1 text-muted-foreground">Unscheduled / free</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Planned by area:{' '}
        {Object.entries(workload.byArea).length
          ? Object.entries(workload.byArea)
              .map(([area, minutes]) => `${area} ${hours(minutes)}`)
              .join(' · ')
          : 'None planned'}
        .{' '}
        {capacity == null
          ? 'Set a capacity to flag overloaded days.'
          : 'Only flexible work is compared with your capacity.'}
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
