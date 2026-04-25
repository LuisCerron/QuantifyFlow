'use client';

import React from 'react';
import { Workflow, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NavList } from './NavList';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

interface PanelProps {
  className?: string;
  navItems: readonly NavItem[];
  pathname: string;
  userDisplayName?: string | null;
  userEmail?: string | null;
  onLogout: () => void;
  onItemClick?: () => void;
}

export function Panel({
  className,
  navItems,
  pathname,
  userDisplayName,
  userEmail,
  onLogout,
  onItemClick,
}: PanelProps) {
  return (
    <div
      className={cn(
        'relative flex h-full flex-col bg-background/70 backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-xl',
        className
      )}
    >
      <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-neutral-300/70 to-transparent dark:via-white/10 lg:block" />

      <div className="px-6 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Workflow className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">QuantifyFlow</h1>
        </div>
      </div>

      <NavList navItems={navItems} pathname={pathname} onItemClick={onItemClick} />

      <div className="mt-auto space-y-2 px-3 pb-4 pt-2">
        <div
          className="truncate rounded-xl bg-black/5 px-3 py-2 text-sm font-medium text-muted-foreground dark:bg-white/10"
          title={userDisplayName || userEmail || 'Usuario'}
        >
          {userDisplayName || userEmail || 'Usuario'}
        </div>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 rounded-xl px-3 py-3 text-muted-foreground transition-colors',
            'hover:bg-destructive/10 hover:text-destructive'
          )}
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}