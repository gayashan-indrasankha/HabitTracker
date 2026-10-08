'use client';

import { useRef, useState } from 'react';
import { manageTimeOffAction, type PlanningState } from '@/lib/actions/planning-actions';
import { ActionForm } from './action-form';

type Plan = {
  id: string;
  date: string;
  type: string;
  title: string | null;
  note: string | null;
  allDay: boolean;
  localStartTime: string | null;
  localEndTime: string | null;
  status: string;
};

export function TimeOffPlanner({ initialDate, plans }: { initialDate: string; plans: Plan[] }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-bold">Plan time off</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Choose a date. Preview fixed commitments and flexible sessions, then explicitly select any
        sessions to excuse. Habits and tasks stay unchanged.
      </p>
      <TimeOffForm key="new" initialDate={initialDate} />
      {plans.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold text-primary">
            Past and planned time off
          </summary>
          <div className="mt-3 space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-xl border p-3">
                <p className="font-semibold">
                  {plan.date} · {plan.type} · {plan.status}
                </p>
                {plan.status === 'active' && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-primary">Edit or cancel</summary>
                    <TimeOffForm initialDate={plan.date} plan={plan} />
                    <ActionForm
                      action={manageTimeOffAction}
                      submitLabel="Cancel time off"
                      className="mt-3"
                    >
                      <input type="hidden" name="id" value={plan.id} />
                      <input type="hidden" name="date" value={plan.date} />
                      <input type="hidden" name="type" value={plan.type} />
                      <input type="hidden" name="allDay" value="on" />
                      <input type="hidden" name="mode" value="cancel" />
                    </ActionForm>
                  </details>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function TimeOffForm({ initialDate, plan }: { initialDate: string; plan?: Plan }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<PlanningState>({});
  const [pending, setPending] = useState(false);
  const [allDay, setAllDay] = useState(plan?.allDay ?? true);
  async function submit(mode: 'preview' | 'save') {
    const form = ref.current;
    if (!form || !form.reportValidity()) return;
    setPending(true);
    try {
      const payload = new FormData(form);
      payload.set('mode', mode);
      const result = await manageTimeOffAction({}, payload);
      setState(result);
    } catch {
      setState({ error: 'Could not update time off. Try again.' });
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      ref={ref}
      onSubmit={(event) => event.preventDefault()}
      onChange={(event) => {
        if (!['selected', 'confirm'].includes(event.target.getAttribute('name') ?? ''))
          setState({});
      }}
      className="mt-3 grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="id" value={plan?.id ?? ''} />
      <label className="text-sm">
        Date
        <input
          type="date"
          name="date"
          required
          defaultValue={initialDate}
          readOnly={Boolean(plan)}
          className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
        />
      </label>
      <label className="text-sm">
        Type
        <select
          name="type"
          defaultValue={plan?.type ?? 'Recovery'}
          className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
        >
          <option>Travel</option>
          <option>Social</option>
          <option>Recovery</option>
          <option>Personal</option>
        </select>
      </label>
      <label className="text-sm">
        Title (optional)
        <input
          name="title"
          maxLength={160}
          defaultValue={plan?.title ?? ''}
          className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
        />
      </label>
      <label className="text-sm">
        Private note (optional)
        <input
          name="note"
          maxLength={1000}
          defaultValue={plan?.note ?? ''}
          className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(event) => setAllDay(event.target.checked)}
        />{' '}
        All day
      </label>
      {!allDay && (
        <div className="flex gap-2">
          <label className="text-sm">
            Start
            <input
              type="time"
              name="start"
              required
              defaultValue={plan?.localStartTime ?? ''}
              className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
            />
          </label>
          <label className="text-sm">
            End
            <input
              type="time"
              name="end"
              required
              defaultValue={plan?.localEndTime ?? ''}
              className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
            />
          </label>
        </div>
      )}
      {state.affected && (
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold">Flexible sessions to excuse (optional)</legend>
          <div className="mt-2 space-y-1">
            {state.affected.map((item) => (
              <label
                key={item.key}
                className="flex min-h-10 items-center gap-2 rounded-lg border px-2 text-sm"
              >
                <input type="checkbox" name="selected" value={item.key} />
                {item.title}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="confirm" value="yes" /> Confirm this plan and selected excusals
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-emerald-700 sm:col-span-2">
          {state.success}
        </p>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void submit('preview')}
          className="min-h-10 rounded-lg border px-4 text-sm font-semibold text-primary disabled:opacity-50"
        >
          Preview affected schedule
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void submit('save')}
          className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {pending ? 'Saving…' : plan ? 'Save time off' : 'Plan time off'}
        </button>
      </div>
    </form>
  );
}
