'use client';

import { useActionState, useEffect, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import {
  deleteEnglishPracticeAction,
  updateEnglishPracticeAction,
} from '@/lib/actions/evidence-actions';
import { ActionForm } from './action-form';
import { EditPracticeButton } from './edit-practice-button';

type Practice = {
  id: string;
  date: string;
  createdAt: string;
  type: string;
  topic: string;
  durationMinutes: number;
};

const types: Record<string, string> = {
  free_speaking: 'Free speaking',
  technical_explanation: 'Technical explanation',
  mock_interview: 'Mock interview',
  conversation: 'Conversation',
  grammar: 'Grammar practice',
  pronunciation: 'Pronunciation',
};
const field = 'mt-1.5 min-h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal';
const label = 'block text-sm font-semibold text-foreground';

export function EnglishPracticeCard({
  practice,
  today,
  renderedAt,
  timezone,
}: {
  practice: Practice;
  today: string;
  renderedAt: string;
  timezone: string;
}) {
  const [localToday, setLocalToday] = useState(today);
  const [editing, setEditing] = useState(false);
  const [deleteState, deleteAction, deleting] = useActionState(deleteEnglishPracticeAction, {});

  useEffect(() => {
    const mountedAt = Date.now();
    const appClockAtMount = new Date(renderedAt).getTime();
    const updateDay = () =>
      setLocalToday(
        formatInTimeZone(
          new Date(appClockAtMount + Date.now() - mountedAt),
          timezone,
          'yyyy-MM-dd',
        ),
      );
    updateDay();
    const timer = window.setInterval(updateDay, 1000);
    return () => window.clearInterval(timer);
  }, [renderedAt, timezone]);

  const canChange =
    formatInTimeZone(new Date(practice.createdAt), timezone, 'yyyy-MM-dd') === localToday;

  return (
    <article className="rounded-xl border bg-background p-4 text-sm">
      <p className="text-xs font-medium text-muted-foreground">{practice.date}</p>
      <h3 className="mt-1 font-semibold">{practice.topic}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {types[practice.type] ?? practice.type.replaceAll('_', ' ')} · {practice.durationMinutes}{' '}
        min
      </p>
      {canChange && (
        <div className="mt-3 flex items-start justify-between gap-3 border-t pt-3">
          <EditPracticeButton expanded={editing} onClick={() => setEditing((open) => !open)} />
          <form action={deleteAction} className="flex flex-col items-end gap-2">
            <input type="hidden" name="id" value={practice.id} />
            <button
              type="submit"
              disabled={deleting}
              aria-label={`Delete ${practice.topic}`}
              title={`Delete ${practice.topic}`}
              className="inline-flex size-9 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-destructive disabled:opacity-50"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
                <path
                  d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6m4-6v6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {deleteState.error && (
              <p role="alert" className="max-w-56 text-right text-xs text-destructive">
                {deleteState.error}
              </p>
            )}
          </form>
        </div>
      )}
      {canChange && editing && (
        <ActionForm
          action={updateEnglishPracticeAction}
          submitLabel="Save changes"
          className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2"
        >
          <input type="hidden" name="id" value={practice.id} />
          <label className={label}>
            Date
            <input
              type="date"
              name="date"
              defaultValue={practice.date}
              max={localToday}
              required
              className={field}
            />
          </label>
          <label className={label}>
            Type
            <select name="type" defaultValue={practice.type} className={field}>
              {Object.entries(types).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Topic
            <input
              name="topic"
              defaultValue={practice.topic}
              maxLength={160}
              required
              className={field}
            />
          </label>
          <label className={label}>
            Minutes
            <input
              type="number"
              name="durationMinutes"
              defaultValue={practice.durationMinutes}
              min="1"
              max="1440"
              required
              className={field}
            />
          </label>
        </ActionForm>
      )}
    </article>
  );
}
