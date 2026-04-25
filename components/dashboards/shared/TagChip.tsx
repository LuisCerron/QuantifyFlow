'use client';

import React, { memo } from 'react';
import { Tag } from '@/types';

interface TagChipProps {
  tag: Tag;
  isLight: boolean;
}

export const TagChip = memo(function TagChip({ tag, isLight }: TagChipProps) {
  const color = tag.color || '#9ca3af';

  if (isLight) {
    return (
      <span className="inline-flex items-center rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {tag.tagName}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-gray-500/10 bg-gray-50 dark:bg-gray-400/10 text-gray-600 dark:text-gray-400">
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {tag.tagName}
    </span>
  );
});