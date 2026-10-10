'use client';

export function EditPracticeButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onClick}
      className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg bg-primary/5 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      Edit practice
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
      >
        <path
          d="m5 7.5 5 5 5-5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
