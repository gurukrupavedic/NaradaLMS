import * as React from 'react';
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

export type UserRole = 'student' | 'instructor' | 'admin';

export interface NavItem {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive?: boolean;
    items?: {
        title: string;
        url: string;
        isContextual?: boolean;
    }[];
}

export interface NavSection {
    items: NavItem[];
}

/**
 * Narada LMS Navigation Configuration
 * Role-based navigation structure for the application
 */

// Learn - Available to all roles
const learnSection: NavSection = {
    items: [
        {
            title: 'Vedic Learning',
            url: '/vedic-learning',
            icon: BookOpenText,
            isActive: true,
        },
    ],
};

// Batches & Progress - Instructor and Admin (used in student portal)
const batchesSection: NavSection = {
    items: [
        {
            title: 'My Batches',
            url: '/instructor/batches',
            icon: UserPlus,
        },
        {
            title: 'My Students',
            url: '/instructor/students',
            icon: CircleUser,
        },
    ],
};

// Content (Tracks & Chapters) - Admin only (used in ops portal under Admin Center)
const contentSection: NavSection = {
    items: [
        {
            title: 'Tracks & Chapters',
            url: '/content',
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
    learn?: NavSection;
    batches?: NavSection;
    content?: NavSection;
    admin?: NavSection;
} {
    // Normalize to array
    const roleArray = Array.isArray(roles) ? roles : (roles ? [roles] : ['student']);

    const nav: any = {};

    // Vedic Learning: Available to Students
    if (roleArray.includes('student')) {
        nav.learn = learnSection;
    }

    // Instructor or Admin: can see batches + learn
    if (roleArray.includes('instructor') || roleArray.includes('admin')) {
        nav.batches = batchesSection;
    }

    // Admin: sees admin center + content (Tracks & Chapters)
    if (roleArray.includes('admin')) {
        nav.admin = adminSection;
        nav.content = contentSection;
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
        content: 'Tracks & Chapters',
        admin: 'Admin Center',
    };
    return labels[key] || '';
}
