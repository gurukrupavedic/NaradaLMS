import {
    LibraryBig,
    Logs,
    Settings,
    UserCog,
    Users,
    LucideIcon,
} from 'lucide-react';

export type UserRole = 'student' | 'instructor' | 'admin';

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
 * Ops Portal Navigation Configuration (Admin only)
 * Admin Center includes Users, Batches, Audit Logs, Settings, and Content Studio.
 */

// Admin Center - Admin only (includes content management)
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
            title: 'Content',
            url: '/admin/content',
            icon: LibraryBig,
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

// Contextual navigation mapping for dynamic routes (chapter editor)
export const contextualNavigation = new Map([
    ['/admin/tracks/:trackId/chapters/:chapterId', {
        label: 'Chapter',
        parentPath: '/admin/content',
        breadcrumbs: [
            { label: 'Admin Center', href: '/admin' },
            { label: 'Content', href: '/admin/content' },
            { label: 'Chapter', href: '#' }
        ]
    }],
]);

/**
 * Get navigation sections for ops-portal (admin only)
 */
export function getOpsNavigationForRole(roles?: UserRole[] | UserRole): {
    admin?: NavSection;
    content?: NavSection;
} {
    const roleArray = Array.isArray(roles) ? roles : (roles ? [roles] : []);
    const nav: { admin?: NavSection; content?: NavSection } = {};

    if (roleArray.includes('admin')) {
        nav.admin = adminSection;
    }

    return nav;
}
