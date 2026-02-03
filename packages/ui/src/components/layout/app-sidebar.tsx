"use client"

import * as React from "react"
import {
    BookOpen,
    Bot,
    Command,
    Frame,
    LifeBuoy,
    Map,
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

// Helper to enhance items with contextual data if needed
// For now, we just pass items through, but in future this would use current path to determine context
const enhanceWithContextualItems = (items: any[], currentPath: string) => {
    return items;
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
}

export function AppSidebar({
    user = { name: 'User', email: 'user@example.com', avatar: '' },
    userRoles = ['student'],
    currentPath,
    onLogout,
    homeHref = "/app",
    ...props
}: AppSidebarProps) {

    const navSections = getNavigationForRole(userRoles);

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
                        items={enhanceWithContextualItems(navSections.learn.items as any, currentPath)}
                        currentPath={currentPath}
                    />
                )}

                {navSections.batches && (
                    <NavMain
                        label={getSectionLabel('batches')}
                        items={navSections.batches.items}
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
                        items={navSections.admin.items}
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
