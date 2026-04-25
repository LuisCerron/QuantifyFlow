'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status?: string;
  isLight: boolean;
}

export function StatusBadge({ status, isLight }: StatusBadgeProps) {
  if (isLight) {
    return (
      <span className="rounded-full border-2 border-black px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-black">
        {status ?? 'Estado'}
      </span>
    );
  }

  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Activo', className: 'bg-emerald-400/15 text-emerald-400' },
    paused: { label: 'Pausado', className: 'bg-amber-400/15 text-amber-400' },
    archived: { label: 'Archivado', className: 'bg-zinc-400/15 text-zinc-400' },
    default: { label: 'Desconocido', className: 'bg-muted text-foreground/70' },
  };
  const { label, className } = map[status || ''] || map.default;
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', className)}>{label}</span>;
}