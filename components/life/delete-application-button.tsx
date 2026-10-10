'use client';

import { useActionState } from 'react';
import { deleteApplicationAction } from '@/lib/actions/evidence-actions';

export function DeleteApplicationButton({ id, company }: { id: string; company: string }) {
  const [state, action, pending] = useActionState(deleteApplicationAction, {});

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Delete opportunity at ${company}`}
        title={`Delete opportunity at ${company}`}
        className="inline-flex size-10 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-destructive disabled:opacity-50"
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
      {state.error && (
        <p role="alert" className="max-w-56 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
