import {
  BookOpen,
  Users,
  PenTool,
  Settings,
  BarChart3,
  LayoutDashboard,
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
      title: 'Dashboard',
      url: '/app/learning',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'Course Content',
      url: '/app/learning/courses',
      icon: BookOpen,
    },
  ],
};

// Batches & Progress - Instructor and Admin
const batchesSection: NavSection = {
  items: [
    {
      title: 'My Batches',
      url: '/app/instructor/batches',
      icon: Users,
    },
    {
      title: 'Student Progress',
      url: '/app/instructor/batches/progress',
      icon: BarChart3,
    },
  ],
};

// Content Studio - Content Manager and Admin
const contentSection: NavSection = {
  items: [
    {
      title: 'Tracks',
      url: '/app/content',
      icon: BookOpen,
    },
    {
      title: 'Media Library',
      url: '/app/content/media',
      icon: PenTool,
    },
  ],
};

// Admin Center - Admin only
const adminSection: NavSection = {
  items: [
    {
      title: 'Users',
      url: '/app/admin/users',
      icon: Users,
    },
    {
      title: 'Batches',
      url: '/app/admin/batches',
      icon: Users,
    },
    {
      title: 'Audit Logs',
      url: '/app/admin/logs',
      icon: BarChart3,
    },
    {
      title: 'Settings',
      url: '/app/admin/settings',
      icon: Settings,
    },
  ],
};

/**
 * Get navigation sections for a specific role
 */
export function getNavigationForRole(role?: UserRole): {
  learn: NavSection;
  batches?: NavSection;
  content?: NavSection;
  admin?: NavSection;
} {
  if (!role) {
    role = 'student';
  }

  const nav: {
    learn: NavSection;
    batches?: NavSection;
    content?: NavSection;
    admin?: NavSection;
  } = {
    learn: learnSection,
  };

  // Instructor: can see batches + learn
  if (role === 'instructor') {
    nav.batches = batchesSection;
  }

  // Content Manager: can see content studio + learn
  if (role === 'content_manager') {
    nav.content = contentSection;
  }

  // Admin: sees everything
  if (role === 'admin') {
    nav.batches = batchesSection;
    nav.content = contentSection;
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
