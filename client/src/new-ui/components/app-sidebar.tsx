'use client';

import * as React from 'react';
import { BookOpen, Settings2 } from 'lucide-react';

import { NavMain } from './nav-main';
import { NavUser } from './nav-user';
import { BrandHeader } from './brand-header';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  getNavigationForRole,
  getSectionLabel,
  type UserRole,
  type NavSection,
} from '@/new-ui/lib/navigation-config';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  userRole?: UserRole;
}

export function AppSidebar({
  user = {
    name: 'User',
    email: 'user@example.com',
    avatar: '',
  },
  userRole = 'student',
  ...props
}: AppSidebarProps) {
  const navSections = getNavigationForRole(userRole);

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header */}
      <SidebarHeader>
        <BrandHeader />
      </SidebarHeader>

      {/* Content - Render all navigation sections */}
      <SidebarContent>
        {/* Learn Section (always visible) */}
        {navSections.learn && (
          <NavMain
            label={getSectionLabel('learn')}
            items={navSections.learn.items}
          />
        )}

        {/* Batches Section (Instructor & Admin) */}
        {navSections.batches && (
          <NavMain
            label={getSectionLabel('batches')}
            items={navSections.batches.items}
          />
        )}

        {/* Content Section (Content Manager & Admin) */}
        {navSections.content && (
          <NavMain
            label={getSectionLabel('content')}
            items={navSections.content.items}
          />
        )}

        {/* Admin Section (Admin only) */}
        {navSections.admin && (
          <NavMain
            label={getSectionLabel('admin')}
            items={navSections.admin.items}
          />
        )}
      </SidebarContent>

      {/* Footer - User profile */}
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
