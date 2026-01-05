'use client';

import React from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';

interface TopNavProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

/**
 * Get breadcrumb from sidebar navigation structure
 * Returns array of breadcrumb segments for flexible rendering
 */
function getBreadcrumbs(pathname: string): string[] {
  // Learn - student
  if (pathname === '/app' || pathname === '/app/learning') {
    return ['Vedic Learning'];
  }

  // Learn Chapter (student)
  if (/^\/app\/learning\/chapter\/[a-zA-Z0-9_-]+/.test(pathname)) {
    const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : undefined;
    const trackOrder = search?.get('trackOrder');
    const chapterOrder = search?.get('chapterOrder');
    const chapterTitle = search?.get('chapterTitle');

    const parts = [] as string[];
    if (trackOrder) parts.push(`T${trackOrder}`);
    if (chapterOrder) parts.push(`CH${chapterOrder}`);
    const labelCore = parts.length > 0 ? `${parts.join('.')}` : '';
    const label = labelCore
      ? `Learn Chapter : ${labelCore}${chapterTitle ? ` ${chapterTitle}` : ''}`
      : `Learn Chapter${chapterTitle ? ` : ${chapterTitle}` : ''}`;

    return ['Vedic Learning', label];
  }

  // Batches & Progress (Instructor)
  if (pathname.includes('/app/instructor/batches')) {
    if (pathname === '/app/instructor/batches') {
      return ['Batches & Progress', 'My Batches'];
    }
    // Batch detail pages
    if (/\/app\/instructor\/batches\/[0-9]+/.test(pathname)) {
      return ['Batches & Progress', 'My Batches', 'Batch Progress'];
    }
    return ['Batches & Progress', 'Student Progress'];
  }

  // My Students (Instructor)
  if (pathname.includes('/app/instructor/students')) {
    if (pathname === '/app/instructor/students') {
      return ['Batches & Progress', 'My Students'];
    }
    // Student detail pages
    if (/\/app\/instructor\/students\/[a-zA-Z0-9_-]+/.test(pathname)) {
      return ['Batches & Progress', 'My Students', 'Student Progress'];
    }
  }

  // Content Studio
  if (pathname.includes('/app/content')) {
    if (pathname === '/app/content') {
      return ['Content Studio', 'Tracks'];
    }
    return ['Content Studio', 'Media Library'];
  }

  // Admin
  if (pathname.includes('/app/admin')) {
    if (pathname.includes('/users')) {
      return ['Admin Center', 'User Management'];
    }
    if (pathname.includes('/logs')) {
      return ['Admin Center', 'Audit Logs'];
    }
    if (/\/app\/admin\/batches\/[0-9]+/.test(pathname)) {
      return ['Admin Center', 'Batches', 'Batch Details'];
    }
    if (pathname.includes('/batches')) {
      return ['Admin Center', 'Batches'];
    }
    if (pathname.includes('/settings')) {
      return ['Admin Center', 'System Settings'];
    }
  }

  return [];
}

export function TopNav({ user }: TopNavProps) {
  const [pathname] = useLocation();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-white dark:bg-black px-4">
      {/* Left side - Sidebar trigger + Breadcrumbs */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <SidebarTrigger className="-ml-1" />
        
        {/* Breadcrumbs - Flexible multi-level navigation */}
        {breadcrumbs.length > 0 && (
          <nav className="hidden sm:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className={index === breadcrumbs.length - 1 ? 'text-foreground' : 'text-muted-foreground'}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
