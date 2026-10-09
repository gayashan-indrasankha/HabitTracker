'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { setDayModeAction } from '@/lib/actions/life-actions';

type DayMode = 'normal' | 'reduced' | 'minimum';

export function DayModeControl({
  date,
  initialMode,
  hasHiddenWork,
}: {
  date: string;
  initialMode: DayMode;
  hasHiddenWork: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [pending, startTransition] = useTransition();
  const showingLess = mode !== 'normal';

  function toggle() {
    if (pending) return;
    const next: DayMode = showingLess ? 'normal' : 'minimum';
    setError('');
    setAnnouncement('');
    startTransition(async () => {
      const form = new FormData();
      form.set('date', date);
      form.set('mode', next);
      try {
        const result = await setDayModeAction({}, form);
        if (result.error) {
          setError(result.error);
          return;
        }
        setMode(next);
        setAnnouncement(next === 'normal' ? 'Full day shown.' : 'Showing less today.');
        router.refresh();
      } catch {
        setError('Could not update today. Try again.');
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-semibold">
          {showingLess ? 'Showing less today' : 'Too much on your plate?'}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {showingLess
            ? hasHiddenWork
              ? 'A shorter list is showing. Your other tasks are still saved.'
              : 'Nothing is hidden right now. You can return to the full view.'
            : 'Show just one focus task. Your other tasks stay saved.'}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
      >
        {pending && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
        {showingLess ? 'Show full day' : 'Show less today'}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
