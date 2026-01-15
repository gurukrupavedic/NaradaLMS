import {
  BookOpen,
  BookOpenText,
  Users,
  Settings,
  UserPlus,
  CircleUser,
  LibraryBig,
  UserCog,
  Logs,
} from 'lucide-react';

export type UserRole = 'student' | 'instructor' | 'content_manager' | 'admin';

export interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}

export interface NavSection {
  items: NavItem[];
}

/**
 * VedicLMS Navigation Configuration
 * Role-based navigation structure for the application
 */

// Learn - Available to all roles
const learnSection: NavSection = {
  items: [
    {
      title: 'Vedic Learning',
      url: '/app/learning',
      icon: BookOpenText,
      isActive: true,
    },
  ],
};

// Batches & Progress - Instructor and Admin
const batchesSection: NavSection = {
  items: [
    {
      title: 'My Batches',
      url: '/app/instructor/batches',
      icon: UserPlus,
    },
    {
      title: 'My Students',
      url: '/app/instructor/students',
      icon: CircleUser,
    },
  ],
};

// Content Studio - Content Manager and Admin
const contentSection: NavSection = {
  items: [
    {
      title: 'Tracks & Chapters',
      url: '/app/content',
      icon: LibraryBig,
    },
  ],
};

// Admin Center - Admin only
const adminSection: NavSection = {
  items: [
    {
      title: 'Users',
      url: '/app/admin/users',
      icon: UserCog,
    },
    {
      title: 'Batches',
      url: '/app/admin/batches',
      icon: Users,
    },
    {
      title: 'Audit Logs',
      url: '/app/admin/logs',
      icon: Logs,
    },
    {
      title: 'Settings',
      url: '/app/admin/settings',
      icon: Settings,
    },
  ],
};

/**
 * Get navigation sections for user roles (supports multi-role)
 */
export function getNavigationForRole(roles?: UserRole[] | UserRole): {
  learn: NavSection;
  batches?: NavSection;
  content?: NavSection;
  admin?: NavSection;
} {
  // Normalize to array
  const roleArray = Array.isArray(roles) ? roles : (roles ? [roles] : ['student']);

  const nav: {
    learn: NavSection;
    batches?: NavSection;
    content?: NavSection;
    admin?: NavSection;
  } = {
    learn: learnSection,
  };

  // Instructor or Admin: can see batches + learn
  if (roleArray.includes('instructor') || roleArray.includes('admin')) {
    nav.batches = batchesSection;
  }

  // Content Manager ONLY: can see content studio + learn
  // Admin does NOT get content studio access (separation of duties)
  if (roleArray.includes('content_manager')) {
    nav.content = contentSection;
  }

  // Admin: sees admin center + batches (content excluded)
  if (roleArray.includes('admin')) {
    nav.admin = adminSection;
  }

  return nav;
}

/**
 * Get section label from key
 */
export function getSectionLabel(key: 'learn' | 'batches' | 'content' | 'admin'): string {
  const labels: Record<string, string> = {
    learn: 'Learn',
    batches: 'Batches & Progress',
    content: 'Content Studio',
    admin: 'Admin Center',
  };
  return labels[key] || '';
}
