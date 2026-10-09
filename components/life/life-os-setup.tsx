'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { applyLifeTemplateAction, previewLifeTemplateAction } from '@/lib/actions/template-actions';
import type { LifeActionState } from '@/lib/actions/life-actions';
import { sectionLabels } from '@/lib/life-os/preset';
import type { Plan } from '@/lib/life-os/install';

const sectionDetails: Record<keyof typeof sectionLabels, string> = {
  university: 'Lecture windows, five editable subjects, study sessions and starter tasks.',
  industry: 'Industry project, milestones and focused work sessions.',
  career: 'Software Engineering and DevOps goals, projects and milestones.',
  interview: 'SE and DevOps topic checklist and practice sessions.',
  english: 'Speaking practice, prompts and a weekly session.',
  fitness: 'Four gym sessions, weight reminders and recovery.',
  nutrition: 'Six optional meal slots and editable planning references.',
  recovery: 'Reading, meditation, sleep and attention routines.',
  review: 'A light Sunday review session.',
};

export function LifeOsSetup() {
  const formRef = useRef<HTMLFormElement>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, installAction, installing] = useActionState(
    async (previous: LifeActionState, form: FormData) => {
      const outcome = await applyLifeTemplateAction(previous, form);
      if (outcome.success) setPlan(null);
      return outcome;
    },
    {},
  );

  function preview() {
    const form = formRef.current;
    if (!form) return;
    const confirmation = form.elements.namedItem('confirm');
    if (confirmation instanceof HTMLInputElement) confirmation.required = false;
    const valid = form.reportValidity();
    if (confirmation instanceof HTMLInputElement) confirmation.required = true;
    if (!valid) return;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await previewLifeTemplateAction(data);
      setPlan(result.plan ?? null);
      setPreviewError(result.error ?? null);
    });
  }

  const grouped = plan
    ? Object.entries(sectionLabels)
        .map(([section, label]) => ({
          section,
          label,
          items: plan.items.filter((item) => item.section === section),
        }))
        .filter((group) => group.items.length)
    : [];
  const count = (status: string) =>
    plan?.items.filter((item) => item.status === status).length ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Optional setup</p>
        <h1 className="text-3xl font-bold tracking-tight">Set up my Life OS</h1>
        <p className="text-sm font-semibold">Preset: Personal Life OS</p>
        <p className="text-sm text-muted-foreground">
          Choose sections, review every proposed change, then confirm once. Existing and customized
          records remain intact. Nothing is marked complete or logged as achieved.
        </p>
      </header>
      <form
        ref={formRef}
        action={installAction}
        onChange={(event) => {
          if (!(event.target instanceof HTMLInputElement) || event.target.name !== 'confirm') {
            setPlan(null);
            setPreviewError(null);
          }
        }}
        className="space-y-6"
      >
        <section className="rounded-2xl border bg-card p-5 space-y-4">
          <h2 className="text-xl font-semibold">Choose sections</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.entries(sectionLabels) as [keyof typeof sectionLabels, string][]).map(
              ([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer gap-3 rounded-xl border p-4 focus-within:ring-2 focus-within:ring-primary"
                >
                  <input
                    type="checkbox"
                    name="section"
                    value={value}
                    defaultChecked
                    className="mt-1 h-5 w-5 accent-primary"
                  />
                  <span>
                    <strong className="block">{label}</strong>
                    <span className="text-sm text-muted-foreground">{sectionDetails[value]}</span>
                  </span>
                </label>
              ),
            )}
          </div>
          <h3 className="font-semibold">Starting references</h3>
          <p className="text-sm text-muted-foreground">
            These are editable planning values. Lecture times are defaults; enter your real times
            before previewing. No travel time is assumed.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['mondayStart', 'Monday lecture start', '08:00'],
                ['mondayEnd', 'Monday lecture end', '18:30'],
                ['tuesdayStart', 'Tuesday lecture start', '08:00'],
                ['tuesdayEnd', 'Tuesday lecture end', '15:00'],
              ] as const
            ).map(([name, label, value]) => (
              <label key={name} className="text-sm">
                {label}
                <input
                  className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3"
                  type="time"
                  name={name}
                  defaultValue={value}
                  required
                />
              </label>
            ))}
            <label className="text-sm">
              Daily calorie reference
              <input
                className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3"
                type="number"
                name="calories"
                defaultValue="3207"
                min="1000"
                max="6000"
                required
              />
            </label>
            <label className="text-sm">
              Daily protein reference (g)
              <input
                className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3"
                type="number"
                name="protein"
                defaultValue="157"
                min="20"
                max="400"
                required
              />
            </label>
          </div>
          <label className="flex items-start gap-3 rounded-xl border p-4 text-sm">
            <input
              type="checkbox"
              name="updateSchedule"
              value="yes"
              className="mt-1 h-5 w-5 accent-primary"
            />
            <span>
              <strong className="block">Apply recommended future schedule changes</strong>Only
              unchanged, flexible sessions from the earlier Life OS preset qualify. Affected
              sessions and conflicts appear in the preview. Earlier occurrences and customized
              schedules stay intact. Fixed lectures are excluded.
            </span>
          </label>
          <button
            type="button"
            onClick={preview}
            disabled={pending}
            className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? 'Checking...' : 'Preview changes'}
          </button>
          {previewError && (
            <p role="alert" className="text-sm text-destructive">
              {previewError}
            </p>
          )}
        </section>
        {plan && (
          <section className="rounded-2xl border bg-card p-5 space-y-5" aria-label="Setup preview">
            <div>
              <h2 className="text-xl font-semibold">Review proposed changes</h2>
              <p className="text-sm text-muted-foreground">
                Starting {plan.today}. Preview is read only and checks your current records.
                Installation checks again inside a transaction.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm" aria-label="Preview counts">
              <span className="rounded-full bg-primary/10 px-3 py-1">{count('new')} new</span>
              <span className="rounded-full bg-primary/10 px-3 py-1">
                {count('update')} future schedule changes
              </span>
              <span className="rounded-full bg-muted px-3 py-1">{count('existing')} existing</span>
              <span className="rounded-full bg-muted px-3 py-1">
                {count('archived') + count('deleted')} archived or removed
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                {count('duplicate') + count('conflict')} needs review
              </span>
            </div>
            {grouped.map((group) => (
              <details
                key={group.section}
                className="rounded-xl border"
                open={group.items.some((item) => item.status === 'conflict')}
              >
                <summary className="cursor-pointer p-4 font-semibold">
                  {group.label}{' '}
                  <span className="font-normal text-muted-foreground">({group.items.length})</span>
                </summary>
                <ul className="divide-y border-t">
                  {group.items.map((item) => (
                    <li
                      key={item.type + item.key}
                      className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:justify-between sm:gap-4"
                    >
                      <span>
                        <strong>{item.name}</strong>
                        <span className="block text-muted-foreground">
                          {item.type} · {item.detail}
                        </span>
                        {item.reason && (
                          <span className="block text-muted-foreground">{item.reason}</span>
                        )}
                      </span>
                      <span className="shrink-0 capitalize font-semibold">{item.status}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            <div className="rounded-xl bg-muted/40 p-4">
              <h3 className="font-semibold">Complete later with your own details</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {plan.needsInput.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="confirm"
                value="yes"
                required
                className="mt-1 h-5 w-5 accent-primary"
              />
              <span>
                I reviewed this preview and want to add new items and apply any listed future
                schedule changes in my selected sections. Existing, archived, removed, duplicate and
                conflicting items will be kept as shown.
              </span>
            </label>
            <button
              type="submit"
              disabled={installing}
              className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {installing ? 'Installing...' : 'Install selected setup'}
            </button>
          </section>
        )}
        {state.error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive p-4 text-sm text-destructive"
          >
            {state.error}
          </p>
        )}
        {state.success && (
          <div role="status" className="rounded-xl border p-4 text-sm space-y-3">
            <p>{state.success}</p>
            <nav aria-label="Open your Life OS" className="flex flex-wrap gap-3">
              {(
                [
                  ['Dashboard', '/dashboard'],
                  ['Today', '/today'],
                  ['Week', '/week'],
                  ['Goals', '/goals'],
                  ['Habits', '/habits'],
                  ['Review', '/review'],
                ] as const
              ).map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </form>
    </div>
  );
}
