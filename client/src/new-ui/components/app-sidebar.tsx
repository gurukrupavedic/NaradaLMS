'use client';

import * as React from 'react';
import { BookOpen, Settings2 } from 'lucide-react';
import { useLocation } from 'wouter';

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
import type { NavMainItem } from './nav-main';

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
  const [location] = useLocation();
  const navSections = getNavigationForRole(userRole);

  // Helper: Inject contextual sub-items based on current route
  const enhanceWithContextualItems = (items: NavMainItem[]): NavMainItem[] => {
    return items.map(item => {
      // Instructor Batches page - add contextual "Batch Details" when viewing a specific batch
      if (item.url === '/app/instructor/batches') {
        const instructorBatchDetailMatch = location.match(/^\/app\/instructor\/batches\/(\d+)$/);
        if (instructorBatchDetailMatch) {
          const batchId = instructorBatchDetailMatch[1];
          return {
            ...item,
            items: [
              {
                title: 'Batch Details',
                url: `/app/instructor/batches/${batchId}`,
                isContextual: true,
              },
            ],
          };
        }
      }

      // Admin Batches page - add contextual "Batch Details" when viewing a specific batch
      if (item.url === '/app/admin/batches') {
        const batchDetailMatch = location.match(/^\/app\/admin\/batches\/(\d+)$/);
        if (batchDetailMatch) {
          const batchId = batchDetailMatch[1];
          return {
            ...item,
            items: [
              {
                title: 'Batch Details',
                url: `/app/admin/batches/${batchId}`,
                isContextual: true,
              },
            ],
          };
        }
      }

      return item;
    });
  };

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

        {/* Batches Section (Instructor & Admin) - Enhanced with contextual items */}
        {navSections.batches && (
          <NavMain
            label={getSectionLabel('batches')}
            items={enhanceWithContextualItems(navSections.batches.items)}
          />
        )}

        {/* Content Section (Content Manager & Admin) */}
        {navSections.content && (
          <NavMain
            label={getSectionLabel('content')}
            items={navSections.content.items}
          />
        )}

        {/* Admin Section (Admin only) - Enhanced with contextual items */}
        {navSections.admin && (
          <NavMain
            label={getSectionLabel('admin')}
            items={enhanceWithContextualItems(navSections.admin.items)}
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
