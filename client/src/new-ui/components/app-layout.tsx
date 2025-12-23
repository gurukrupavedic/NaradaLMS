'use client';

import React from 'react';
import { AppSidebar } from './app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { TopNav } from './top-nav';
import type { UserRole } from '@/new-ui/lib/navigation-config';

interface AppLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  userRole?: UserRole;
}

export function AppLayout({
  children,
  user = {
    name: 'User',
    email: 'user@example.com',
  },
  userRole = 'student',
}: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} userRole={userRole} />
      <SidebarInset>
        <TopNav user={user} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
