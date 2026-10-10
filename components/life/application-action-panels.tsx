'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type Panel = 'edit' | 'stage' | 'history';

const actionClass =
  'inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function ApplicationActionPanels({
  edit,
  stage,
  history,
}: {
  edit: ReactNode;
  stage: ReactNode;
  history: ReactNode;
}) {
  const [open, setOpen] = useState<Panel | null>(null);
  const id = useId();

  function toggle(panel: Panel) {
    setOpen((current) => (current === panel ? null : panel));
  }

  function trigger(panel: Panel, label: string) {
    const expanded = open === panel;
    return (
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${id}-${panel}`}
        onClick={() => toggle(panel)}
        className={`${actionClass} ${expanded ? 'border-primary/40 bg-primary/10' : ''}`}
      >
        <span>{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
    );
  }

  return (
    <div className="mt-4 min-w-0 border-t pt-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {trigger('edit', 'Edit details')}
        {trigger('stage', 'Update stage')}
      </div>
      <div className="mt-2">{trigger('history', 'Stage history')}</div>
      <div id={`${id}-edit`} hidden={open !== 'edit'} className="mt-3 min-w-0">
        {edit}
      </div>
      <div id={`${id}-stage`} hidden={open !== 'stage'} className="mt-3 min-w-0">
        {stage}
      </div>
      <div id={`${id}-history`} hidden={open !== 'history'} className="mt-3 min-w-0">
        {history}
      </div>
    </div>
  );
}
