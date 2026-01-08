'use client';

import * as React from 'react';
import { BookOpen, Settings2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

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

interface ChapterData {
  id: number;
  trackId: number;
  title: string;
  track?: {
    id: number;
    title: string;
  };
  chapterOrder?: number;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  userRoles?: UserRole[];
}

export function AppSidebar({
  user = {
    name: 'User',
    email: 'user@example.com',
    avatar: '',
  },
  userRoles = ['student'],
  ...props
}: AppSidebarProps) {
  const [location] = useLocation();
  const navSections = getNavigationForRole(userRoles);

  // Extract chapter ID from location to fetch chapter data for sidebar label
  const chapterMatch = location.match(/^\/app\/learning\/chapter\/(\d+)/);
  const chapterId = chapterMatch ? parseInt(chapterMatch[1]) : null;

  // Fetch chapter data for label (optional - sidebar will work without it)
  const { data: chapter } = useQuery<ChapterData>({
    queryKey: [`/api/chapters/${chapterId}/details`],
    enabled: !!chapterId,
  });

  // Helper: Inject contextual sub-items based on current route
  const enhanceWithContextualItems = (items: any[]): NavMainItem[] => {
    return items.map(item => {
      // Instructor Batches page - add contextual "Batch Progress" when viewing a specific batch
      if (item.url === '/app/instructor/batches') {
        const instructorBatchDetailMatch = location.match(/^\/app\/instructor\/batches\/(\d+)$/);
        if (instructorBatchDetailMatch) {
          const batchId = instructorBatchDetailMatch[1];
          return {
            ...item,
            items: [
              {
                title: 'Batch Progress',
                url: `/app/instructor/batches/${batchId}`,
                isContextual: true,
              },
            ],
          };
        }
      }

      // Instructor Students page - add contextual "Student Progress" when viewing a specific student
      if (item.url === '/app/instructor/students') {
        const studentDetailMatch = location.match(/^\/app\/instructor\/students\/(.+)$/);
        if (studentDetailMatch) {
          const studentId = studentDetailMatch[1];
          return {
            ...item,
            items: [
              {
                title: 'Student Progress',
                url: `/app/instructor/students/${studentId}`,
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

      // Student learning page - add contextual "Learn Chapter" when viewing a specific chapter
      if (item.url === '/app/learning') {
        if (chapterId) {
          let suffix = '';
          if (chapter?.track?.id && chapter?.chapterOrder) {
            suffix = ` : T${chapter.track.id}.CH${chapter.chapterOrder}`;
          }
          return {
            ...item,
            items: [
              {
                title: `Learn Chapter${suffix}`,
                url: `/app/learning/chapter/${chapterId}`,
                isContextual: true,
              },
            ],
          };
        }
      }

      // Content Studio: Add contextual "Chapter Content" under Tracks & Chapters
      if (item.url === '/app/content') {
        // Only show if currently on an editor route (no localStorage fallback)
        const editorMatch = location.match(/^\/app\/content\/tracks\/(\d+)\/chapters\/(\d+)$/);
        if (editorMatch) {
          const trackId = editorMatch[1];
          const chapterId = editorMatch[2];
          const contextualUrl = `/app/content/tracks/${trackId}/chapters/${chapterId}`;

          // Add track/chapter suffix to label
          const suffix = ` : T${trackId}.CH${chapterId}`;

          return {
            ...item,
            items: [
              {
                title: `Chapter Content${suffix}`,
                url: contextualUrl,
                isContextual: true,
              },
            ],
          } as any;
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
            items={enhanceWithContextualItems(navSections.learn.items as any)}
          />
        )}

        {/* Batches Section (Instructor & Admin) - Enhanced with contextual items */}
        {navSections.batches && (
          <NavMain
            label={getSectionLabel('batches')}
            items={enhanceWithContextualItems(navSections.batches.items as any)}
          />
        )}

        {/* Content Section (Content Manager & Admin) */}
        {navSections.content && (
          <NavMain
            label={getSectionLabel('content')}
            items={enhanceWithContextualItems(navSections.content.items as any)}
          />
        )}

        {/* Admin Section (Admin only) - Enhanced with contextual items */}
        {navSections.admin && (
          <NavMain
            label={getSectionLabel('admin')}
            items={enhanceWithContextualItems(navSections.admin.items as any)}
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
