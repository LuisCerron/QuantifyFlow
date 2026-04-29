import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header row skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Graph container skeleton */}
      <div className="relative h-[80vh] border rounded-xl overflow-hidden bg-muted/30">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
        
        {/* Floating nodes skeleton */}
        <div className="absolute inset-0 p-8">
          {/* Node row 1 */}
          <div className="flex gap-6 mb-8">
            <DependencyNodeSkeleton delay="0ms" accentColor="violet" />
            <DependencyNodeSkeleton delay="100ms" accentColor="cyan" />
          </div>
          
          {/* Connection lines */}
          <div className="absolute top-[140px] left-[100px] w-px h-16 bg-gradient-to-b from-violet-500/30 to-cyan-500/30" />
          <div className="absolute top-[140px] left-[320px] w-px h-16 bg-gradient-to-b from-cyan-500/30 to-fuchsia-500/30" />
          
          {/* Node row 2 */}
          <div className="flex gap-6 mt-24">
            <DependencyNodeSkeleton delay="200ms" accentColor="fuchsia" />
            <DependencyNodeSkeleton delay="300ms" accentColor="violet" />
            <DependencyNodeSkeleton delay="400ms" accentColor="cyan" />
          </div>
          
          {/* More connection lines */}
          <div className="absolute top-[300px] left-[100px] w-40 h-px bg-gradient-to-r from-fuchsia-500/30 via-violet-500/30 to-cyan-500/30" />
          
          {/* Node row 3 */}
          <div className="flex gap-6 mt-20">
            <DependencyNodeSkeleton delay="500ms" accentColor="cyan" />
            <DependencyNodeSkeleton delay="600ms" accentColor="fuchsia" />
          </div>
        </div>

        {/* Legend panel skeleton */}
        <div className="absolute top-4 right-4 bg-card/80 backdrop-blur-sm border rounded-lg p-4 shadow-lg">
          <Skeleton className="h-5 w-16 mb-3" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-red-400/60" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-green-400/60" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-blue-400/60" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>

        {/* Controls skeleton */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>

        {/* Minimap skeleton */}
        <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur-sm border rounded-lg p-2">
          <Skeleton className="h-24 w-40 rounded" />
        </div>
      </div>
    </div>
  );
}

function DependencyNodeSkeleton({ 
  delay = "0ms", 
  accentColor = "violet" 
}: { 
  delay?: string; 
  accentColor?: "violet" | "cyan" | "fuchsia" 
}) {
  const accentStyles: Record<string, string> = {
    violet: "shadow-violet-500/20 dark:shadow-violet-500/10 border-violet-200 dark:border-violet-800/50",
    cyan: "shadow-cyan-500/20 dark:shadow-cyan-500/10 border-cyan-200 dark:border-cyan-800/50",
    fuchsia: "shadow-fuchsia-500/20 dark:shadow-fuchsia-500/10 border-fuchsia-200 dark:border-fuchsia-800/50",
  };

  const accentBorders: Record<string, string> = {
    violet: "border-l-violet-400 dark:border-l-violet-600",
    cyan: "border-l-cyan-400 dark:border-l-cyan-600",
    fuchsia: "border-l-fuchsia-400 dark:border-l-fuchsia-600",
  };

  return (
    <div 
      className={`relative bg-card/80 backdrop-blur-sm rounded-lg border-2 border-l-4 shadow-lg p-4 min-w-[180px] ${accentStyles[accentColor]} ${accentBorders[accentColor]}`}
      style={{ animationDelay: delay }}
    >
      {/* Node header */}
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-5 flex-1" />
      </div>
      
      {/* Node content */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      
      {/* Status badge */}
      <div className="mt-3 flex justify-end">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Connection handles */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-muted-foreground/30" />
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-muted-foreground/30" />
    </div>
  );
}