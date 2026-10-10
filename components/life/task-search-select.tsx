'use client';

import { useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';

type TaskOption = { id: string; title: string };

export function TaskSearchSelect({ tasks }: { tasks: TaskOption[] }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const search = query.trim().toLocaleLowerCase();
  const words = search.split(/\s+/).filter(Boolean);
  const matches = tasks
    .filter((task) => words.every((word) => task.title.toLocaleLowerCase().includes(word)))
    .sort((a, b) => {
      const rank = (title: string) => {
        const value = title.toLocaleLowerCase();
        if (!search) return 3;
        if (value === search) return 0;
        if (value.startsWith(search)) return 1;
        if (value.includes(search)) return 2;
        return 3;
      };
      return rank(a.title) - rank(b.title) || a.title.localeCompare(b.title);
    });

  function choose(task: TaskOption) {
    setQuery(task.title);
    setSelectedId(task.id);
    setOpen(false);
    inputRef.current?.setCustomValidity('');
  }

  return (
    <div className="relative min-w-0 text-sm font-medium">
      <label htmlFor={`${listId}-input`}>Task</label>
      <div className="relative mt-1.5">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && matches.length
              ? `${listId}-option-${Math.min(activeIndex, matches.length - 1)}`
              : undefined
          }
          autoComplete="off"
          required
          value={query}
          placeholder="Search tasks by name"
          className="min-h-11 w-full rounded-xl border bg-background py-2 pl-10 pr-3 font-normal outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
          onFocus={(event) => {
            event.currentTarget.select();
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId('');
            setActiveIndex(0);
            setOpen(true);
            event.target.setCustomValidity(
              event.target.value ? 'Choose a task from the results.' : '',
            );
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
              return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              if (matches.length) {
                setActiveIndex((current) => {
                  if (!open) return event.key === 'ArrowDown' ? 0 : matches.length - 1;
                  return event.key === 'ArrowDown'
                    ? (current + 1) % matches.length
                    : (current - 1 + matches.length) % matches.length;
                });
              }
            }
            if (event.key === 'Enter' && open && matches.length) {
              event.preventDefault();
              choose(matches[Math.min(activeIndex, matches.length - 1)]);
            }
          }}
        />
        <input type="hidden" name="id" value={selectedId} />
      </div>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Matching tasks"
          className="absolute z-30 mt-1 w-full rounded-xl border bg-card p-1 shadow-lg"
        >
          {matches.length ? (
            <ul role="presentation" className="max-h-64 overflow-y-auto">
              {matches.map((task, index) => (
                <li
                  key={task.id}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={selectedId === task.id}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    choose(task);
                  }}
                  onClick={() => choose(task)}
                  className={`cursor-pointer rounded-lg px-3 py-2 font-normal ${index === activeIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'}`}
                >
                  {task.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm font-normal text-muted-foreground">
              No matching tasks.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
