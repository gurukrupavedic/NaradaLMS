"use client"

import * as React from "react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "../sidebar"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { BrandHeader, type BrandHeaderBranding } from "./brand-header"
import { getNavigationForRole, UserRole, getSectionLabel } from "../../lib/navigation-config"

const enhanceWithContextualItems = (items: any[], currentPath: string | null | undefined, contextualNav?: Map<string, any>, contentContextLabel?: string | null) => {
    if (!items) return [];

    // Normalize path for matching (strip trailing slash and query params); guard against null/undefined in SSR
    const normalizedPath = (currentPath ?? "").split('?')[0].replace(/\/$/, "");

    return items.map(item => {
        // 1. Check dynamic contextual navigation Map if provided
        if (contextualNav) {
            for (const [pattern, config] of Array.from(contextualNav.entries())) {
                // Check if current sidebar item is the parent for this contextual route
                if (item.url === config.parentPath) {
                    // Convert route pattern with :id to regex
                    const regexPattern = pattern.replace(/:[a-zA-Z0-9_]+/g, '([^/]+)');
                    const regex = new RegExp(`^${regexPattern}$`);
                    const match = normalizedPath.match(regex);

                    if (match) {
                        const isContentChapter = (pattern.startsWith('/content/tracks/') || pattern.startsWith('/admin/tracks/')) && pattern.includes('/chapters/');
                        // Prefer page-set label (e.g. "Track 1. Chapter 2"); otherwise fall back to static config.label ("Chapter")
                        const fullLabel = isContentChapter && contentContextLabel != null && contentContextLabel !== ''
                            ? contentContextLabel
                            : config.label;
                        const title = isContentChapter && fullLabel !== config.label
                            ? fullLabel.replace(/\s*: .*$/, '')
                            : fullLabel;
                        return {
                            ...item,
                            items: [
                                ...(item.items || []),
                                {
                                    title,
                                    url: normalizedPath,
                                    isContextual: true,
                                }
                            ]
                        };
                    }
                }
            }
        }

        // 2. Hardcoded fallbacks for existing patterns
        if (item.url === '/my-learning' || item.url === '/app/learning') {
            const chapterMatch = normalizedPath.match(/\/learning\/chapter\/(\d+)/);
            if (chapterMatch) {
                // Same convention as ops portal: full label in breadcrumb, short label (no ": Title") in sidebar
                const fullLabel = (contentContextLabel != null && contentContextLabel !== '')
                    ? contentContextLabel
                    : 'Learn Chapter';
                const title = fullLabel.replace(/\s*: .*$/, '') || fullLabel;
                return {
                    ...item,
                    items: [
                        {
                            title,
                            url: normalizedPath,
                            isContextual: true,
                        },
                    ],
                };
            }
        }

        if (item.url === '/admin/batches') {
            const batchDetailMatch = normalizedPath.match(/^\/admin\/batches\/(\d+)$/);
            if (batchDetailMatch) {
                const batchId = batchDetailMatch[1];
                return {
                    ...item,
                    items: [
                        {
                            title: 'Batch Details',
                            url: `/admin/batches/${batchId}`,
                            isContextual: true,
                        },
                    ],
                };
            }
        }

        return item;
    });
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    user: {
        name: string;
        email: string;
        avatar: string;
    };
    userRoles: UserRole[];
    currentPath: string; // Passed from parent (AppShell)
    onLogout: () => void;
    homeHref?: string;
    customNavigation?: any;
    contextualNavigation?: Map<string, any>;
    contentContextLabel?: string | null;
    brandHeaderBranding?: BrandHeaderBranding;
}

export function AppSidebar({
    user = { name: 'User', email: 'user@example.com', avatar: '' },
    userRoles = ['student'],
    currentPath,
    onLogout,
    homeHref = "/app",
    customNavigation,
    contextualNavigation,
    contentContextLabel,
    brandHeaderBranding,
    ...props
}: AppSidebarProps) {

    const navSections = customNavigation || getNavigationForRole(userRoles);
    const safePath = currentPath ?? "";

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <BrandHeader homeHref={homeHref} branding={brandHeaderBranding} />
            </SidebarHeader>
            <SidebarContent>
                {/* Render Sections based on Role Config */}

                {navSections.learn && (
                    <NavMain
                        label={getSectionLabel('learn')}
                        items={enhanceWithContextualItems(navSections.learn.items as any, safePath, contextualNavigation, contentContextLabel)}
                        currentPath={safePath}
                    />
                )}

                {navSections.batches && (
                    <NavMain
                        label={getSectionLabel('batches')}
                        items={enhanceWithContextualItems(navSections.batches.items as any, safePath, contextualNavigation)}
                        currentPath={safePath}
                    />
                )}

                {navSections.content && (
                    <NavMain
                        label={getSectionLabel('content')}
                        items={enhanceWithContextualItems(navSections.content.items as any, safePath, contextualNavigation, contentContextLabel)}
                        currentPath={safePath}
                    />
                )}

                {navSections.admin && (
                    <NavMain
                        label={getSectionLabel('admin')}
                        items={enhanceWithContextualItems(navSections.admin.items as any, safePath, contextualNavigation, contentContextLabel)}
                        currentPath={safePath}
                    />
                )}

            </SidebarContent>
            <SidebarFooter>
                <NavUser user={user} onLogout={onLogout} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
