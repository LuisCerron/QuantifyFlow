"use client";

import { useEffect, useState } from "react";

// Simple CSS-only splash screen - no imports that could break
export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Durante SSR, renderizar placeholder simple
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        <div className="h-16 w-16 rounded-2xl bg-muted animate-pulse" />
        <div className="mt-4 h-6 w-32 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  // Splash completo después del mount
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/5 blur-3xl" />
      </div>

      {/* Logo placeholder with gradient */}
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br from-violet-500/20 via-cyan-500/20 to-fuchsia-500/20 blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/25">
          {/* Inner shape as logo placeholder */}
          <div className="h-8 w-8 rounded-lg bg-white/30" />
        </div>
      </div>

      {/* Brand name */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <h1 className="bg-gradient-to-r from-violet-600 via-cyan-500 to-fuchsia-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          QuantifyFlow
        </h1>
        <p className="text-sm text-muted-foreground">Preparando tu espacio de trabajo...</p>
      </div>

      {/* Animated bars */}
      <div className="mt-4 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 animate-pulse"
            style={{
              animationDelay: `${i * 150}ms`,
              width: `${16 + i * 8}px`,
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 flex items-center gap-2">
        <div className="h-px w-8 bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
        <span className="text-xs text-muted-foreground/60">v1.0.0</span>
        <div className="h-px w-8 bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
      </div>
    </div>
  );
}