'use client';

import { useMemo, useState } from 'react';
import { managePriorityAction } from '@/lib/actions/life-actions';
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
}: {
  date: string;
  choices: BacklogChoice[];
  occupied: Array<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');
  const [project, setProject] = useState('');
  const [rank, setRank] = useState(occupied.findIndex((item) => !item) + 1 || 1);
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
  return (
    <div className="mt-4 border-t pt-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="min-h-11 rounded-lg border px-3 py-2 font-semibold text-primary"
      >
        {open ? 'Close task search' : 'Add to Today'}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              Search tasks
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Task title"
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Priority slot
              <select
                value={rank}
                onChange={(event) => setRank(Number(event.target.value))}
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              >
                {[1, 2, 3].map((slot) => (
                  <option key={slot} value={slot}>
                    Priority {slot}
                    {occupied[slot - 1] ? ` — ${occupied[slot - 1]}` : ' — empty'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Life area
              <select
                value={area}
                onChange={(event) => setArea(event.target.value)}
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
                onChange={(event) => setProject(event.target.value)}
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
          {replace && (
            <p className="rounded-lg bg-amber-500/10 p-2 text-sm">
              Replacing {occupiedTitle} in Priority {rank} leaves that task in your backlog.
            </p>
          )}
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {options.map((task) => (
              <ActionForm
                key={task.id}
                action={managePriorityAction}
                submitLabel={replace ? 'Replace priority' : 'Add to slot'}
                className="rounded-lg border p-3 text-sm"
              >
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="rank" value={rank} />
                <input type="hidden" name="operation" value={replace ? 'replace' : 'assign'} />
                <p className="font-semibold">{task.title}</p>
                <p className="mb-2 text-xs text-muted-foreground">
                  {task.area}
                  {task.projectName ? ` · ${task.projectName}` : ''}
                  {task.dueDate ? ` · Due ${task.dueDate}` : ' · Unscheduled'}
                </p>
                {replace && (
                  <label className="mb-2 flex items-center gap-2 text-xs">
                    <input type="checkbox" name="confirm" value="yes" required /> Replace{' '}
                    {occupiedTitle}
                  </label>
                )}
              </ActionForm>
            ))}
            {!options.length && <p className="text-sm text-muted-foreground">No matching tasks.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
