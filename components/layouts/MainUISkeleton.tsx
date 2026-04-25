export function MainUISkeleton() {
  return (
    <div className="flex h-screen">
      <div className="w-64 shrink-0 animate-pulse bg-muted" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 animate-pulse border-b bg-muted" />
        <div className="flex-1 animate-pulse bg-background p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}