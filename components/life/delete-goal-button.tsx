'use client';

import { useActionState } from 'react';
import { deleteGoalAction } from '@/lib/actions/life-actions';

export function DeleteGoalButton({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(deleteGoalAction, {});

  return (
    <form action={action} className="ml-auto flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Delete ${title}`}
        title={`Delete ${title}`}
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
      {state.error && (
        <p role="alert" className="max-w-56 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
