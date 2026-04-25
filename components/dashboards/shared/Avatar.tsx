'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  isLight: boolean;
}

export function Avatar({ name, src, isLight }: AvatarProps) {
  const initials =
    (name || '')
      .trim()
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  if (isLight) {
    return (
      <div className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-black text-black">
        {src ? (
          <img alt={name || 'avatar'} src={src} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-semibold">{initials}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-foreground">
      {src ? (
        <img alt={name || 'avatar'} src={src} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold">{initials}</span>
      )}
    </div>
  );
}