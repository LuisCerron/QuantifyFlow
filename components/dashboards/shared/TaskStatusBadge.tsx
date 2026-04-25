'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface TaskStatusBadgeProps {
  status?: string;
  isLight: boolean;
}

export const TaskStatusBadge = memo(function TaskStatusBadge({ status, isLight }: TaskStatusBadgeProps) {
  const s = String(status || '').toLowerCase();
  const label = s.replace(/-/g, ' ') || '—';

  if (isLight) {
    return (
      <span className="rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
        {label}
      </span>
    );
  }

  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium ring-2 ring-neutral-300/80 text-muted-foreground dark:ring-white/20">
      {label}
    </span>
  );
});