import {
    CircleUser,
    LibraryBig,
    Logs,
    Settings,
    UserCog,
    UserPlus,
    Users,
    LucideIcon,
} from 'lucide-react';

export type UserRole = 'student' | 'instructor' | 'admin' | 'content_manager';

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon;
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
 * Ops Portal Navigation Configuration
 * Defines navigation structure for Admin, Instructor, and Content Manager roles.
 * Uses role-based URL prefixes:
 * - Admin: /admin/*
 * - Instructor: /instructor/*
 * - Content Manager: /content/*
 */

// Admin Center - Admin only
const adminSection: NavSection = {
    items: [
        {
            title: 'Users',
            url: '/admin/users',
            icon: UserCog,
        },
        {
            title: 'Batches',
            url: '/admin/batches',
            icon: Users,
        },
        {
            title: 'Audit Logs',
            url: '/admin/logs',
            icon: Logs,
        },
        {
            title: 'Settings',
            url: '/admin/settings',
            icon: Settings,
        },
    ],
};

// Batches & Progress - Instructor and Admin
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

// Content Studio - Content Manager and Admin
const contentSection: NavSection = {
    items: [
        {
            title: 'Tracks & Chapters',
            url: '/content',
            icon: LibraryBig,
        },
    ],
};

// Contextual navigation mapping for dynamic routes
export const contextualNavigation = new Map([
    // Student Progress Context
    ['/instructor/students/:id', {
        label: 'Student Progress',
        parentPath: '/instructor/students',
        breadcrumbs: [
            { label: 'My Students', href: '/instructor/students' },
            { label: 'Progress', href: '#' }
        ]
    }],

    // Batch Progress Context
    ['/instructor/batches/:id', {
        label: 'Batch Details',
        parentPath: '/instructor/batches',
        breadcrumbs: [
            { label: 'My Batches', href: '/instructor/batches' },
            { label: 'Details', href: '#' }
        ]
    }],
]);

/**
 * Get navigation sections for ops-portal user roles
 */
export function getOpsNavigationForRole(roles?: UserRole[] | UserRole): {
    batches?: NavSection;
    content?: NavSection;
    admin?: NavSection;
} {
    // Normalize to array
    const roleArray = Array.isArray(roles) ? roles : (roles ? [roles] : []);

    const nav: {
        batches?: NavSection;
        content?: NavSection;
        admin?: NavSection;
    } = {};

    // Instructor or Admin: can see batches
    if (roleArray.includes('instructor') || roleArray.includes('admin')) {
        nav.batches = batchesSection;
    }

    // Content Manager ONLY: can see content studio
    // Admin does NOT get content studio access here (separation of duties)
    // NOTE: If Admin needs content access, add 'content_manager' role to user
    if (roleArray.includes('content_manager')) {
        nav.content = contentSection;
    }

    // Admin: sees admin center
    if (roleArray.includes('admin')) {
        nav.admin = adminSection;
    }

    return nav;
}
