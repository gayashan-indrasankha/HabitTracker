'use client';

import { useActionState, useRef, useState, type ReactNode } from 'react';
import type { LifeActionState } from '@/lib/actions/life-actions';

export function ActionForm({
  action,
  children,
  className = '',
  submitLabel = 'Save',
  previewAction,
  previewLabel = 'Check conflicts',
}: {
  action: (state: LifeActionState, form: FormData) => Promise<LifeActionState>;
  children: ReactNode;
  className?: string;
  submitLabel?: string;
  previewAction?: (state: LifeActionState, form: FormData) => Promise<LifeActionState>;
  previewLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [previewState, setPreviewState] = useState<LifeActionState | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  async function preview() {
    if (!previewAction || !formRef.current) return;
    if (!formRef.current.reportValidity()) return;
    setPreviewPending(true);
    try {
      setPreviewState(await previewAction({}, new FormData(formRef.current)));
    } catch {
      setPreviewState({ error: 'Could not check conflicts. Try again.' });
    } finally {
      setPreviewPending(false);
    }
  }
  return (
    <form
      ref={formRef}
      action={formAction}
      className={className}
      onChange={() => setPreviewState(null)}
      onSubmit={() => setPreviewState(null)}
    >
      {children}
      {previewState?.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {previewState.error}
        </p>
      )}
      {previewState?.success && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
          {previewState.success}
        </p>
      )}
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
      {previewAction && (
        <button
          type="button"
          disabled={pending || previewPending}
          onClick={preview}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
        >
          {previewPending ? 'Checking…' : previewLabel}
        </button>
      )}
    </form>
  );
}
