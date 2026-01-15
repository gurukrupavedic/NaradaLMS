'use client';

import React from 'react';
import { AppSidebar } from './app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { TopNav } from './top-nav';
import type { UserRole } from '@/lib/navigation-config';

interface AppLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  userRoles?: UserRole[];
}

export function AppLayout({
  children,
  user = {
    name: 'User',
    email: 'user@example.com',
  },
  userRoles = ['student'],
}: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} userRoles={userRoles} />
      <SidebarInset className="min-w-0">
        <TopNav user={user} />
        <main className="flex-1 overflow-auto min-w-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
