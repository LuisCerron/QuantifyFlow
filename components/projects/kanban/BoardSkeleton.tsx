import React from "react";

export default function BoardSkeleton() {
  return (
    <>
      <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 2xl:-mx-12 2xl:px-12 mb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-64 animate-pulse rounded-xl bg-muted" />
            <div className="h-10 w-32 animate-pulse rounded-xl bg-muted" />
            <div className="h-10 w-32 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-4 md:gap-6 overflow-x-auto pb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-[0_0_320px] md:flex-[0_0_360px] xl:flex-[0_0_380px] shrink-0">
            <div className="rounded-2xl border-2 border-black dark:border-transparent dark:bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-5 w-8 animate-pulse rounded bg-muted" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="h-28 animate-pulse rounded-xl bg-muted/70" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}