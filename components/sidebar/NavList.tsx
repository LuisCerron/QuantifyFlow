'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

interface NavListProps {
  navItems: readonly NavItem[];
  pathname: string;
  onItemClick?: () => void;
}

export function NavList({ navItems, pathname, onItemClick }: NavListProps) {
  return (
    <nav className="flex-1 space-y-1 px-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Button
            key={item.href}
            asChild
            variant="ghost"
            onClick={onItemClick}
            className={cn(
              'group relative w-full justify-start gap-3 rounded-xl px-3 py-3 transition-all',
              'hover:bg-black/5 dark:hover:bg-white/5',
              isActive && 'text-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Link href={item.href}>
              <span className="relative inline-flex items-center gap-3">
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 rounded-xl bg-black/5 dark:bg-white/5"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-3">
                  <motion.span
                    aria-hidden="true"
                    className={cn(
                      'relative -ml-1 h-6 w-[3px] rounded-full bg-gradient-to-b from-indigo-500 via-violet-500 to-fuchsia-500',
                      isActive ? 'opacity-100' : 'opacity-0'
                    )}
                    animate={{ opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.18 }}
                  />
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </span>
              </span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}