'use client';

import React from 'react';
import { ClipboardList, Timer, CheckCircle2, Activity as ActivityIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateLocale } from '@/lib/utils/date';
import { ActivityLog } from '@/types';

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface ActivityItemProps {
  log: ActivityLog;
  isLight: boolean;
}

export function ActivityItem({ log, isLight }: ActivityItemProps) {
  const iconMap: Record<string, IconType> = {
    created_task: ClipboardList,
    updated_task: ActivityIcon,
    moved_task: Timer,
    completed_task: CheckCircle2,
    default: ActivityIcon,
  };
  const label = (log as any).action?.replace(/_/g, ' ') ?? 'actividad';
  const Icon = iconMap[(log as any).action] || iconMap.default;
  const when = formatDateLocale((log as any).createdAt) ?? '—';

  if (isLight) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border-2 border-black px-3 py-2 text-sm">
        <div className="inline-flex items-center gap-2 text-black">
          <Icon className="h-4 w-4" />
          <span className="capitalize font-semibold">{label}</span>
        </div>
        <span className="whitespace-nowrap text-xs text-black/70">{when}</span>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-white/5">
      <div className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="capitalize">{label}</span>
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{when}</span>
    </li>
  );
}