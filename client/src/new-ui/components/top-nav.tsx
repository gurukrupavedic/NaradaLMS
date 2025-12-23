'use client';

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
 * Maps routes to section > page (e.g., "Learn > Dashboard")
 */
function getBreadcrumbs(pathname: string): { section: string; page: string } | null {
  // Learn
  if (pathname === '/app' || pathname === '/app/learning') {
    return { section: 'Learn', page: 'Dashboard' };
  }

  if (pathname.includes('/app/learning/courses')) {
    return { section: 'Learn', page: 'Course Content' };
  }

  // Batches & Progress
  if (pathname.includes('/app/batches')) {
    if (pathname === '/app/batches') {
      return { section: 'Batches & Progress', page: 'My Batches' };
    }
    return { section: 'Batches & Progress', page: 'Student Progress' };
  }

  // Content Studio
  if (pathname.includes('/app/content')) {
    if (pathname === '/app/content') {
      return { section: 'Content Studio', page: 'Tracks' };
    }
    return { section: 'Content Studio', page: 'Media Library' };
  }

  // Admin
  if (pathname.includes('/app/admin')) {
    if (pathname === '/app/admin') {
      return { section: 'Admin', page: 'Dashboard' };
    }
    if (pathname.includes('/users')) {
      return { section: 'Admin', page: 'Users' };
    }
    if (pathname.includes('/logs')) {
      return { section: 'Admin', page: 'Audit Logs' };
    }
    if (pathname.includes('/batches')) {
      return { section: 'Admin', page: 'Batches' };
    }
    if (pathname.includes('/settings')) {
      return { section: 'Admin', page: 'Settings' };
    }
  }

  return null;
}

export function TopNav({ user }: TopNavProps) {
  const [pathname] = useLocation();
  const breadcrumb = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
      {/* Left side - Sidebar trigger + Breadcrumbs */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <SidebarTrigger className="-ml-1" />
        
        {/* Breadcrumbs - Simple section > page */}
        {breadcrumb && (
          <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{breadcrumb.section}</span>
            <ChevronRight className="h-4 w-4" />
            <span>{breadcrumb.page}</span>
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
