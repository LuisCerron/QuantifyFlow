"use client";

const brandColors = [
  { shadow: "shadow-violet-500/10", dot: "bg-violet-400/30" },
  { shadow: "shadow-cyan-500/10", dot: "bg-cyan-400/30" },
  { shadow: "shadow-fuchsia-500/10", dot: "bg-fuchsia-400/30" },
  { shadow: "shadow-violet-500/10", dot: "bg-violet-400/30" },
];

function StatCardSkeleton({ index }: { index: number }) {
  const brand = brandColors[index % brandColors.length];
  
  return (
    <div className={`h-28 animate-pulse rounded-2xl bg-muted/50 border border-muted/30 ${brand.shadow} shadow-lg relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent dark:from-white/[0.02]" />
      <div className="p-4 flex flex-col justify-between h-full relative">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className={`h-2.5 w-2.5 rounded-full ${brand.dot}`} />
            <div className="h-3 w-20 rounded bg-muted/60" />
          </div>
          <div className={`h-10 w-10 rounded-xl ${brand.dot} relative`}>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-6 w-24 rounded bg-muted/80" />
          <div className="h-3 w-16 rounded bg-muted/50" />
        </div>
      </div>
    </div>
  );
}

function ActivityItemSkeleton({ index }: { index: number }) {
  const brand = brandColors[index % brandColors.length];
  
  return (
    <div className={`h-20 animate-pulse rounded-xl bg-muted/40 border border-muted/20 ${brand.shadow} shadow-sm relative overflow-hidden p-4`}>
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-transparent dark:from-white/[0.01]" />
      <div className="flex items-center gap-3 h-full relative">
        <div className={`h-10 w-10 rounded-full ${brand.dot} relative flex-shrink-0`}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-3/4 rounded bg-muted/70" />
          <div className="h-2.5 w-1/2 rounded bg-muted/50" />
        </div>
        <div className="h-6 w-16 rounded bg-muted/40" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 2xl:px-12">
      <header className="mb-8">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-cyan-500/5" />
        </div>
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted/70 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-muted/50 to-transparent" />
        </div>
      </header>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} index={i} />
        ))}
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted/80 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-transparent" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <ActivityItemSkeleton key={i} index={i} />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted/80 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <ActivityItemSkeleton key={i} index={i + 3} />
          ))}
        </div>
      </div>
    </div>
  );
}