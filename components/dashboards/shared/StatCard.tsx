'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface StatCardProps {
  title: string;
  value: string | number;
  Icon: IconType;
  gradient?: string;
  isLight: boolean;
}

export function StatCard({
  title,
  value,
  Icon,
  gradient = 'from-indigo-500 via-violet-500 to-fuchsia-500',
  isLight,
}: StatCardProps) {
  if (isLight) {
    return (
      <div className="rounded-2xl border-2 border-black p-2 transition-transform hover:-translate-y-0.5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black text-black">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-black/70">{title}</p>
            <p className="text-2xl font-extrabold text-black leading-tight">{value}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl p-5 ring-2 ring-neutral-300/90 transition hover:ring-violet-500/60 dark:ring-white/20">
      <div className={cn('absolute inset-0 opacity-10 blur-2xl bg-gradient-to-r', gradient)} />
      <div className="relative z-10 flex items-center gap-4">
        <div className={cn('rounded-xl p-3 text-white shadow-sm bg-gradient-to-br', gradient)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}