'use client';

import { useRef } from 'react';
import { ArrowUpRight, X } from 'lucide-react';

export function PastJournalEntry({
  id,
  date,
  dateLabel,
  content,
}: {
  id: string;
  date: string;
  dateLabel: string;
  content: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = `journal-entry-${id}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="group block w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
        aria-label={`Read journal entry for ${dateLabel}`}
      >
        <span className="flex items-center justify-between gap-3">
          <time
            dateTime={date}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {dateLabel}
          </time>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
            Read entry <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
        </span>
        <span className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
          {content}
        </span>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="fixed left-1/2 top-1/2 m-0 max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-card p-0 text-foreground shadow-2xl backdrop:bg-slate-950/50"
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Journal entry
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-semibold">
              {dateLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close journal entry"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(85vh-5rem)] overflow-y-auto px-5 py-5 sm:px-6">
          <p className="whitespace-pre-wrap break-words text-sm leading-7">{content}</p>
        </div>
      </dialog>
    </>
  );
}
