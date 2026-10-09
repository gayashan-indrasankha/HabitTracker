'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleDot } from 'lucide-react';

export function HabitNameTooltip({
  name,
  icon,
  description,
  archived,
}: {
  name: string;
  icon: string | null;
  description: string | null;
  archived: boolean;
}) {
  const id = useId();
  const nameRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    maxHeight: number;
    below: boolean;
  } | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const element = nameRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const below = rect.top < 140;
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)),
      top: below ? rect.bottom + 8 : rect.top - 8,
      maxHeight: below ? window.innerHeight - rect.bottom - 24 : rect.top - 16,
      below,
    });
  }

  function hideSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPosition(null), 120);
  }

  return (
    <span className="flex min-w-0 items-center gap-2.5" onMouseEnter={show} onMouseLeave={hideSoon}>
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
      >
        {icon || <CircleDot className="h-4 w-4" />}
      </span>
      <span
        ref={nameRef}
        tabIndex={0}
        aria-describedby={position ? id : undefined}
        onFocus={show}
        onBlur={() => setPosition(null)}
        className="block min-w-0 truncate rounded-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {name}
        {archived ? ' (Archived)' : ''}
      </span>
      {position &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{
              left: position.left,
              top: position.top,
              maxHeight: position.maxHeight,
            }}
            onMouseEnter={() => {
              if (closeTimer.current) clearTimeout(closeTimer.current);
            }}
            onMouseLeave={hideSoon}
            className={`habit-name-tooltip fixed z-50 block w-max max-w-[min(20rem,calc(100vw-1rem))] overflow-y-auto rounded-xl border bg-popover px-3 py-2 text-left text-popover-foreground shadow-xl ${position.below ? '' : '-translate-y-full'}`}
          >
            <span className="block whitespace-normal break-words text-sm font-semibold">
              {name}
              {archived ? ' (Archived)' : ''}
            </span>
            {description && (
              <span className="mt-1 block whitespace-pre-wrap break-words text-xs font-normal text-muted-foreground">
                {description}
              </span>
            )}
          </span>,
          document.body,
        )}
    </span>
  );
}
