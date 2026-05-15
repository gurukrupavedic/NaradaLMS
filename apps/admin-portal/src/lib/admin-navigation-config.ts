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

const usersNavItem: NavItem = {
    title: 'Users',
    url: '/admin/users',
    icon: UserCog,
};

const orgAdminNavItems: NavItem[] = [
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
];

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
 * Admin sidebar: platform Users (super-admin only) vs org modules (active org admin anywhere).
 */
export function getAdminNavigationForAccess(input: {
    isSuperAdmin: boolean;
    hasOrgAdminAnywhere: boolean;
}): {
    admin?: NavSection;
    content?: NavSection;
} {
    const items: NavItem[] = [];
    if (input.isSuperAdmin) {
        items.push(usersNavItem);
    }
    if (input.hasOrgAdminAnywhere) {
        items.push(...orgAdminNavItems);
    }
    if (items.length === 0) {
        return {};
    }
    return { admin: { items } };
}
