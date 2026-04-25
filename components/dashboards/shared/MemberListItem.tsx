'use client';

import React from 'react';
import { Mail, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamMemberWithDetails } from '@/types/dashboard-types';
import { Avatar } from './Avatar';

interface MemberListItemProps {
  member: TeamMemberWithDetails;
  isLight: boolean;
}

export function MemberListItem({ member, isLight }: MemberListItemProps) {
  if (isLight) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border-2 border-black px-3 py-2">
        <div className="flex items-center gap-3">
          <Avatar name={member.displayName} src={(member as any).photoURL} isLight />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-black">{member.displayName}</p>
            <p className="flex items-center gap-1 truncate text-xs text-black/70">
              <Mail className="h-3.5 w-3.5" />
              {member.email}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border-2 border-black px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-black">
          <Shield className="h-3.5 w-3.5" />
          {(member as any).role || 'miembro'}
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5">
      <div className="flex items-center gap-3">
        <Avatar name={member.displayName} src={(member as any).photoURL} isLight={false} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{member.displayName}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {member.email}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        <Shield className="h-3.5 w-3.5" />
        {(member as any).role || 'miembro'}
      </span>
    </li>
  );
}