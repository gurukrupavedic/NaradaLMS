"use client"

import * as React from "react"
import {
    BookOpen,
    Bot,
    Command,
    Frame,
    LifeBuoy,
    Map as MapIcon,
    PieChart,
    Send,
    Settings2,
    SquareTerminal,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "../sidebar"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { BrandHeader } from "./brand-header"
import { getNavigationForRole, UserRole, getSectionLabel } from "../../lib/navigation-config"

const enhanceWithContextualItems = (items: any[], currentPath: string, contextualNav?: Map<string, any>) => {
    if (!items) return [];

    // Normalize path for matching (strip trailing slash and query params)
    const normalizedPath = currentPath.split('?')[0].replace(/\/$/, "");

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
                        return {
                            ...item,
                            items: [
                                ...(item.items || []),
                                {
                                    title: config.label,
                                    url: currentPath,
                                    isContextual: true,
                                }
                            ]
                        };
                    }
                }
            }
        }

        // 2. Hardcoded fallbacks for existing patterns
        if (item.url === '/vedic-learning' || item.url === '/app/learning') {
            const chapterMatch = currentPath.match(/\/learning\/chapter\/(\d+)/);
            if (chapterMatch) {
                return {
                    ...item,
                    items: [
                        {
                            title: 'Learn Chapter',
                            url: currentPath,
                            isContextual: true,
                        },
                    ],
                };
            }
        }

        if (item.url === '/admin/batches') {
            const batchDetailMatch = currentPath.match(/^\/admin\/batches\/(\d+)$/);
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
}

export function AppSidebar({
    user = { name: 'User', email: 'user@example.com', avatar: '' },
    userRoles = ['student'],
    currentPath,
    onLogout,
    homeHref = "/app",
    customNavigation,
    contextualNavigation,
    ...props
}: AppSidebarProps) {

    const navSections = customNavigation || getNavigationForRole(userRoles);


    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <BrandHeader homeHref={homeHref} />
            </SidebarHeader>
            <SidebarContent>
                {/* Render Sections based on Role Config */}

                {navSections.learn && (
                    <NavMain
                        label={getSectionLabel('learn')}
                        items={enhanceWithContextualItems(navSections.learn.items as any, currentPath, contextualNavigation)}
                        currentPath={currentPath}
                    />
                )}

                {navSections.batches && (
                    <NavMain
                        label={getSectionLabel('batches')}
                        items={enhanceWithContextualItems(navSections.batches.items as any, currentPath, contextualNavigation)}
                        currentPath={currentPath}
                    />
                )}

                {navSections.content && (
                    <NavMain
                        label={getSectionLabel('content')}
                        items={navSections.content.items}
                        currentPath={currentPath}
                    />
                )}

                {navSections.admin && (
                    <NavMain
                        label={getSectionLabel('admin')}
                        items={enhanceWithContextualItems(navSections.admin.items as any, currentPath, contextualNavigation)}
                        currentPath={currentPath}
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
