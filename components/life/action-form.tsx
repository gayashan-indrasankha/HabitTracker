'use client';

import { useActionState, type ReactNode } from 'react';
import type { LifeActionState } from '@/lib/actions/life-actions';

export function ActionForm({
  action,
  children,
  className = '',
  submitLabel = 'Save',
}: {
  action: (state: LifeActionState, form: FormData) => Promise<LifeActionState>;
  children: ReactNode;
  className?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
          {state.success}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
