export function DashboardSkeleton() {
  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 2xl:px-12">
      <header className="mb-8">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted/70" />
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    </div>
  );
}