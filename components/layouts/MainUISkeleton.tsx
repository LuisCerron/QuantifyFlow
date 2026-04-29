"use client";

export function MainUISkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <div className="relative flex h-full flex-col bg-background/70 backdrop-blur-md">
          {/* Subtle right border gradient */}
          <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-neutral-300/70 to-transparent dark:via-white/10 lg:block" />

          {/* Logo section */}
          <div className="px-6 pb-5 pt-6">
            <div className="flex items-center gap-3">
              {/* Logo icon with violet accent */}
              <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted animate-pulse">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10" />
              </div>
              {/* Logo text */}
              <div className="h-6 w-32 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 space-y-1 px-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-3 py-3"
              >
                {/* Active indicator bar (only first item) */}
                {i === 0 && (
                  <div className="h-6 w-[3px] animate-pulse rounded-full bg-gradient-to-b from-violet-500/30 via-fuchsia-500/30 to-violet-500/30" />
                )}
                {/* Icon circle */}
                <div
                  className={`relative h-9 w-9 shrink-0 animate-pulse rounded-xl ${
                    i === 0 ? "bg-muted" : "bg-muted/70"
                  }`}
                >
                  {i === 0 && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/5" />
                  )}
                </div>
                {/* Text bar */}
                <div
                  className={`h-4 animate-pulse rounded-md ${
                    i === 0 ? "w-24 bg-muted" : "w-20 bg-muted/60"
                  }`}
                />
              </div>
            ))}
          </nav>

          {/* User section at bottom */}
          <div className="mt-auto space-y-2 px-3 pb-4 pt-2">
            {/* User info box */}
            <div className="h-10 animate-pulse rounded-xl bg-muted/50 px-3 py-2" />
            {/* Logout button */}
            <div className="h-10 animate-pulse rounded-xl bg-muted/40" />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 lg:left-64 z-50 h-14 bg-background/70 backdrop-blur-md">
          <div className="flex h-14 w-full items-center justify-between px-3 sm:px-6 lg:px-8">
            {/* Left side: menu button (mobile) + logo + text */}
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <div className="relative h-9 w-9 animate-pulse rounded-xl bg-muted lg:hidden">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/5 to-transparent" />
              </div>
              {/* Logo icon */}
              <div className="relative h-8 w-8 animate-pulse rounded-xl bg-muted">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/5" />
              </div>
              {/* Welcome text */}
              <div className="hidden h-4 w-24 animate-pulse rounded-md bg-muted sm:block" />
            </div>

            {/* Right side: theme toggle */}
            <div className="relative h-9 w-9 animate-pulse rounded-full bg-muted">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-transparent" />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pt-14">
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
            <div className="mx-auto max-w-7xl space-y-6">
              {/* Page title */}
              <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/80" />

              {/* Dashboard cards grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Card 1 - Featured (violet accent) */}
                <div className="group relative h-40 animate-pulse overflow-hidden rounded-2xl bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500/20 via-transparent to-transparent" />
                </div>

                {/* Card 2 - Cyan accent */}
                <div className="group relative h-40 animate-pulse overflow-hidden rounded-2xl bg-muted/90">
                  <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500/8 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                </div>

                {/* Card 3 - Fuchsia accent */}
                <div className="group relative h-40 animate-pulse overflow-hidden rounded-2xl bg-muted/85">
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/6 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent to-fuchsia-500/20" />
                </div>

                {/* Card 4 - Mixed violet/cyan */}
                <div className="group relative h-40 animate-pulse overflow-hidden rounded-2xl bg-muted/80">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-cyan-500/3 to-transparent" />
                </div>

                {/* Card 5 */}
                <div className="group relative h-40 animate-pulse overflow-hidden rounded-2xl bg-muted/75">
                  <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500/5 via-transparent to-transparent" />
                </div>

                {/* Card 6 */}
                <div className="group relative h-40 animate-pulse overflow-hidden rounded-2xl bg-muted/70">
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/4 via-transparent to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}