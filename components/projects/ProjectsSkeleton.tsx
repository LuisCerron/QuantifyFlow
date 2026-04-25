import React from "react";

export default function ProjectsSkeleton() {
  return (
    <>
      <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="h-11 w-full sm:w-72 animate-pulse rounded-2xl bg-muted" />
          <div className="h-11 w-28 animate-pulse rounded-2xl bg-muted" />
          <div className="h-11 w-36 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl p-5 border-2 border-black dark:border-transparent dark:bg-card/60 dark:shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)]"
          >
            <div className="h-6 w-3/4 animate-pulse rounded-md bg-black/10 dark:bg-muted/60" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-md bg-black/10 dark:bg-muted/50" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded-md bg-black/10 dark:bg-muted/50" />
            <div className="mt-6 flex justify-end">
              <div className="h-5 w-24 animate-pulse rounded-md bg-black/10 dark:bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}