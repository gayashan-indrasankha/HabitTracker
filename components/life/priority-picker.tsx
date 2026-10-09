'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Plus, Search, X } from 'lucide-react';
import { managePriorityAction, type LifeActionState } from '@/lib/actions/life-actions';
import { ActionForm } from './action-form';

export type BacklogChoice = {
  id: string;
  title: string;
  area: string;
  projectId: string | null;
  projectName: string | null;
  dueDate: string | null;
  scheduledDate: string | null;
};

export function PriorityPicker({
  date,
  choices,
  occupied,
  triggerLabel = 'Add to Today',
}: {
  date: string;
  choices: BacklogChoice[];
  occupied: Array<string | null>;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');
  const [project, setProject] = useState('');
  const [rank, setRank] = useState(occupied.findIndex((item) => !item) + 1 || 1);
  const [visibleCount, setVisibleCount] = useState(6);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const options = useMemo(
    () =>
      choices
        .filter(
          (item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) &&
            (!area || item.area === area) &&
            (!project || item.projectId === project),
        )
        .sort((a, b) => {
          const category = (item: BacklogChoice) =>
            item.dueDate && item.dueDate < date
              ? 0
              : item.dueDate && item.dueDate <= date
                ? 1
                : item.dueDate
                  ? 2
                  : 3;
          return (
            category(a) - category(b) ||
            (a.dueDate ?? '').localeCompare(b.dueDate ?? '') ||
            a.title.localeCompare(b.title)
          );
        }),
    [choices, query, area, project, date],
  );
  const occupiedTitle = occupied[rank - 1];
  const replace = Boolean(occupiedTitle);
  function close() {
    setOpen(false);
    setQuery('');
    setArea('');
    setProject('');
    setVisibleCount(6);
    setConfirmReplacement(false);
  }
  async function assign(state: LifeActionState, form: FormData): Promise<LifeActionState> {
    const result = await managePriorityAction(state, form);
    if (result.success) {
      close();
      const nextEmpty = occupied.findIndex((item, index) => !item && index !== rank - 1);
      if (nextEmpty >= 0) setRank(nextEmpty + 1);
    }
    return result;
  }
  return (
    <div className="mt-5 border-t pt-5">
      {!open && (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-dashed border-primary/35 bg-primary/[0.035] px-4 py-3 text-left text-primary transition-colors hover:border-primary hover:bg-primary/[0.07]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Plus aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">{triggerLabel}</span>
            <span className="block text-xs text-muted-foreground">
              Choose from your saved tasks
            </span>
          </span>
        </button>
      )}
      {open && (
        <div className="rounded-2xl border border-primary/20 bg-background p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Choose a focus task</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Pick a saved task and where it should appear in your list.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close task search"
              onClick={close}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Search tasks
              <span className="relative mt-1.5 block">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setVisibleCount(6);
                  }}
                  placeholder="Search by task name"
                  className="min-h-11 w-full rounded-lg border bg-background pl-10 pr-3 font-normal"
                />
              </span>
            </label>
            <label className="text-sm font-medium">
              Priority slot
              <select
                value={rank}
                onChange={(event) => {
                  setRank(Number(event.target.value));
                  setConfirmReplacement(false);
                }}
                className="mt-1.5 min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 font-normal"
              >
                {[1, 2, 3].map((slot) => (
                  <option key={slot} value={slot}>
                    Priority {slot}
                    {occupied[slot - 1] ? ` — ${occupied[slot - 1]}` : ' — empty'}
                  </option>
                ))}
              </select>
            </label>
            <details className="group sm:col-span-2">
              <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 py-2 text-sm font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 -rotate-90 transition-transform group-open:rotate-0"
                />
                More filters
              </summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-sm">
                  Life area
                  <select
                    value={area}
                    onChange={(event) => {
                      setArea(event.target.value);
                      setVisibleCount(6);
                    }}
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="">All areas</option>
                    {[...new Set(choices.map((item) => item.area))].sort().map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Project
                  <select
                    value={project}
                    onChange={(event) => {
                      setProject(event.target.value);
                      setVisibleCount(6);
                    }}
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="">All projects</option>
                    {[
                      ...new Map(
                        choices
                          .filter((item) => item.projectId)
                          .map((item) => [item.projectId!, item.projectName ?? 'Untitled project']),
                      ).entries(),
                    ].map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>
          </div>
          {replace && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3 text-sm">
              <input
                type="checkbox"
                checked={confirmReplacement}
                onChange={(event) => setConfirmReplacement(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                <span className="block font-medium">Replace {occupiedTitle}</span>
                <span className="block text-muted-foreground">
                  The current task stays saved and can be chosen again later.
                </span>
              </span>
            </label>
          )}
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {options.length} {options.length === 1 ? 'task' : 'tasks'} available
            </p>
            <div className="space-y-2">
              {options.slice(0, visibleCount).map((task) => (
                <ActionForm
                  key={task.id}
                  action={assign}
                  submitLabel={replace ? 'Replace priority' : 'Add to slot'}
                  submitDisabled={replace && !confirmReplacement}
                  showSuccess={false}
                  className="flex flex-col items-stretch gap-3 rounded-xl border bg-background px-3 py-3 text-sm transition-colors hover:border-primary/35 hover:bg-primary/[0.025] sm:flex-row sm:items-center sm:justify-between sm:px-4 [&>button[type=submit]]:w-full sm:[&>button[type=submit]]:w-auto"
                >
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="date" value={date} />
                  <input type="hidden" name="rank" value={rank} />
                  <input type="hidden" name="operation" value={replace ? 'replace' : 'assign'} />
                  {replace && (
                    <input type="hidden" name="confirm" value={confirmReplacement ? 'yes' : ''} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-semibold leading-snug">
                      {task.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {task.area}
                      {task.projectName ? ` · ${task.projectName}` : ''}
                      {task.dueDate ? ` · Due ${task.dueDate}` : ' · Unscheduled'}
                    </span>
                  </span>
                </ActionForm>
              ))}
              {!options.length && (
                <p className="rounded-xl bg-muted/50 px-4 py-5 text-sm text-muted-foreground">
                  No matching tasks. Try a different search or filter.
                </p>
              )}
            </div>
            {options.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + 6)}
                className="mt-3 min-h-10 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary/5"
              >
                Show more tasks ({options.length - visibleCount} remaining)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
