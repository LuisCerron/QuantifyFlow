'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface PriorityChipProps {
  priority?: string;
  isLight: boolean;
}

export const PriorityChip = memo(function PriorityChip({ priority, isLight }: PriorityChipProps) {
  if (isLight) {
    return (
      <span className="rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
        {priority}
      </span>
    );
  }

  const p = String(priority || '').toLowerCase();
  const map: Record<string, string> = {
    alta: 'text-rose-500 ring-rose-500/40',
    high: 'text-rose-500 ring-rose-500/40',
    media: 'text-amber-600 ring-amber-500/40',
    medium: 'text-amber-600 ring-amber-500/40',
    baja: 'text-sky-600 ring-sky-500/40',
    low: 'text-sky-600 ring-sky-500/40',
  };
  const cls = map[p] || 'text-muted-foreground ring-neutral-300/80 dark:ring-white/20';
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium ring-2', cls)}>{priority}</span>;
});