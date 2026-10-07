export function GridSkeleton() {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-max animate-pulse">
          {/* Header */}
          <div className="flex border-b">
            <div className="sticky left-0 w-44 shrink-0 bg-card px-4 py-3">
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="flex w-9 shrink-0 flex-col items-center py-2 gap-1">
                <div className="h-2 w-4 rounded bg-muted/60" />
                <div className="h-3 w-4 rounded bg-muted/60" />
              </div>
            ))}
            <div className="w-16 shrink-0" />
          </div>
          {/* Rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex border-b last:border-b-0">
              <div className="sticky left-0 w-44 shrink-0 bg-card px-4 py-3">
                <div className="h-4 w-28 rounded bg-muted" />
              </div>
              {Array.from({ length: 30 }).map((_, j) => (
                <div key={j} className="flex w-9 shrink-0 items-center justify-center py-2">
                  <div className="h-5 w-5 rounded-md bg-muted/40" />
                </div>
              ))}
              <div className="flex w-16 shrink-0 items-center justify-center">
                <div className="h-3 w-8 rounded bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
      <GridSkeleton />
    </div>
  );
}
