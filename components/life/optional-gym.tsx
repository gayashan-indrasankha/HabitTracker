import { manageOptionalGymAction } from '@/lib/actions/planning-actions';
import type { BlockRule } from '@/lib/planning/time-blocks';
import { ActionForm } from './action-form';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function OptionalGym({ block, today }: { block: BlockRule | null; today: string }) {
  const day = block ? Math.max(0, block.weekdayMask.indexOf('1')) : 0;
  const kind =
    block?.title === 'Main workout'
      ? 'main'
      : block?.title === 'Technique practice'
        ? 'technique'
        : block?.title === 'Mobility/recovery'
          ? 'mobility'
          : 'light';
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-bold">Optional fifth gym visit</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The template’s four main visits stay intact. Choose a light, technique, mobility, or main
        session when recovery allows. A rest day is neutral. A strict two-training-days-then-rest
        cycle may not fit five hard sessions in every calendar week.
      </p>
      <ActionForm
        action={manageOptionalGymAction}
        submitLabel="Save optional workout"
        className="mt-3 grid gap-3 sm:grid-cols-2"
      >
        <label className="text-sm">
          Setting
          <select
            name="enabled"
            defaultValue={block?.status === 'active' ? 'yes' : 'no'}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
          >
            <option value="yes">Enabled</option>
            <option value="no">Disabled</option>
          </select>
        </label>
        <label className="text-sm">
          Preferred day
          <select
            name="day"
            defaultValue={day}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
          >
            {days.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Session type
          <select
            name="type"
            defaultValue={kind}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
          >
            <option value="light">Optional light workout</option>
            <option value="technique">Technique practice</option>
            <option value="mobility">Mobility/recovery</option>
            <option value="main">Main workout</option>
          </select>
        </label>
        <label className="text-sm">
          Effective from
          <input
            type="date"
            name="effectiveDate"
            min={today}
            defaultValue={today}
            required
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
          />
        </label>
        <label className="text-sm">
          Start
          <input
            type="time"
            name="start"
            required
            defaultValue={block?.localStartTime ?? '17:30'}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
          />
        </label>
        <label className="text-sm">
          End
          <input
            type="time"
            name="end"
            required
            defaultValue={block?.localEndTime ?? '18:15'}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="allowOverlap" /> Confirm a flexible overlap after reviewing
          the error
        </label>
      </ActionForm>
      <p className="mt-2 text-xs text-muted-foreground">
        Move or skip one visit with Adjust in the planner. Disabling preserves earlier completion
        and exception records.
      </p>
    </section>
  );
}
