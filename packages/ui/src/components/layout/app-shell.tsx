"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../sidebar"
import { AppSidebar } from "./app-sidebar"
import { ThemeToggle } from "../theme-toggle"
import { Separator } from "../separator"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "../breadcrumb"
import { UserRole } from "../../lib/navigation-config"
import { usePathname } from "next/navigation"
import { cn } from "../../lib/utils"
import { Home } from "lucide-react"

interface AppShellProps {
    children: React.ReactNode
    user: {
        name: string;
        email: string;
        avatar: string;
    }
    userRoles: UserRole[]
    onLogout: () => void
    homeHref?: string
    customNavigation?: any
    contextualNavigation?: Map<string, any>
    /** Optional label for content chapter (e.g. "Track 1. Chapter 3") for breadcrumb and sidebar */
    contentContextLabel?: string | null
    /** Paths on which the browser window scrolls instead of the main content (e.g. ['/vedic-learning']). Other pages keep viewport-constrained inner scroll. */
    documentScrollPaths?: string[]
}

export function AppShell({ children, user, userRoles, onLogout, homeHref = "/app", customNavigation, contextualNavigation, contentContextLabel, documentScrollPaths }: AppShellProps) {
    // We need to pass currentPath to Sidebar for active state
    // Since this is in @narada/ui, we assume usage in Next.js app context
    const pathname = usePathname()
    // Guard against null during SSR / pre-hydration (avoids Internal Server Error)
    const path = pathname ?? ""

    const constrainToViewport = documentScrollPaths?.some(
        (p) => path === p || path.startsWith(p + "/")
    )
        ? false
        : true

    return (
        <SidebarProvider constrainToViewport={constrainToViewport}>
            <AppSidebar
                user={user}
                userRoles={userRoles}
                onLogout={onLogout}
                currentPath={path}
                homeHref={homeHref}
                customNavigation={customNavigation}
                contextualNavigation={contextualNavigation}
                contentContextLabel={contentContextLabel}
            />
            <SidebarInset>
                <header className="flex shrink-0 items-center justify-between gap-2 min-h-[4.25rem] h-[4.25rem] sm:min-h-16 sm:h-16 lg:min-h-14 lg:h-14 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:min-h-12 group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b bg-background px-3 sm:px-4">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <SidebarTrigger className="-ml-1 shrink-0" />
                        <Separator orientation="vertical" className="mr-2 h-4 shrink-0 hidden sm:block" />
                        {/* Breadcrumbs can be enhanced later to be dynamic based on pathname */}
                        <Breadcrumb className="min-w-0 overflow-hidden">
                            <BreadcrumbList className="min-w-0 truncate">
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href={homeHref} aria-label="Home">
                                        <Home className="h-4 w-4" />
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                {(() => {
                                    // Simple path-based breadcrumb generation (path is pathname ?? "" to avoid null in SSR)
                                    let segments: { label: string, href?: string }[] = [];

                                    if (path === '/vedic-learning' || path === '/app/learning') {
                                        segments = [{ label: 'Vedic Learning' }];
                                    } else if (path.match(/\/learning\/chapter\/\d+/)) {
                                        segments = [
                                            { label: 'Vedic Learning', href: '/vedic-learning' },
                                            { label: contentContextLabel ?? 'Learn Chapter' }
                                        ];
                                    } else if (path.startsWith('/admin') && !path.startsWith('/admin/content') && !path.startsWith('/admin/tracks')) {
                                        segments = [{ label: 'Admin Center', href: '/admin' }];
                                        if (path.includes('/users')) segments.push({ label: 'Users', href: '/admin/users' });
                                        if (path.includes('/batches')) {
                                            segments.push({ label: 'Batches', href: '/admin/batches' });
                                            if (path.match(/\/batches\/\d+/)) {
                                                segments.push({ label: 'Batch Details' });
                                            }
                                        }
                                        if (path.includes('/logs')) segments.push({ label: 'Audit Logs', href: '/admin/logs' });
                                        if (path.includes('/settings')) segments.push({ label: 'Settings', href: '/admin/settings' });
                                    } else if (path.startsWith('/instructor')) {
                                        segments = [{ label: 'Batches & Progress', href: '/instructor/batches' }];
                                        if (path.includes('/batches')) {
                                            segments.push({ label: 'My Batches', href: '/instructor/batches' });
                                            if (path.match(/\/instructor\/batches\/[^/]+/)) {
                                                segments.push({ label: 'Batch Details' });
                                            }
                                        }
                                        if (path.includes('/students')) {
                                            segments.push({ label: 'My Students', href: '/instructor/students' });
                                            if (path.match(/\/instructor\/students\/[^/]+/)) {
                                                segments.push({ label: 'Student Progress' });
                                            }
                                        }
                                    } else if (path.startsWith('/content')) {
                                        // Ops portal Content section (routes under /content)
                                        const isContentRoot = path === '/content' || path === '/content/';
                                        const contentTracksMatch = path.match(/^\/content\/tracks\/([^/]+)\/chapters\/([^/]+)$/);
                                        segments = [
                                            { label: 'Admin Center', href: '/admin' },
                                            isContentRoot
                                                ? { label: 'Content' }
                                                : { label: 'Content', href: '/content' },
                                        ];
                                        if (!isContentRoot && contentTracksMatch) {
                                            segments.push({ label: contentContextLabel ?? 'Chapter' });
                                        }
                                    } else if (path.startsWith('/admin/content') || path.startsWith('/admin/tracks')) {
                                        const tracksMatch = path.match(/\/admin\/tracks\/([^/]+)/);
                                        const chaptersMatch = path.match(/\/admin\/tracks\/[^/]+\/chapters\/([^/]+)/);
                                        const isContentRoot = path === '/admin/content' || path === '/admin/content/';
                                        segments = [
                                            { label: 'Admin Center', href: '/admin' },
                                            isContentRoot
                                                ? { label: 'Content' }
                                                : { label: 'Content', href: '/admin/content' },
                                        ];
                                        if (!isContentRoot && !tracksMatch) {
                                            segments.push({ label: 'Content' });
                                        } else if (tracksMatch) {
                                            if (chaptersMatch) {
                                                segments.push({ label: contentContextLabel ?? 'Chapter' });
                                            }
                                        }
                                    } else {
                                        // Fallback for unknown routes
                                        segments = [{ label: 'Vedic Learning' }];
                                    }

                                    return segments.map((segment, index) => (
                                        <React.Fragment key={index}>
                                            <BreadcrumbItem className="min-w-0 truncate">
                                                {segment.href ? (
                                                    <BreadcrumbLink href={segment.href} className="truncate block">
                                                        {segment.label}
                                                    </BreadcrumbLink>
                                                ) : (
                                                    <BreadcrumbPage className="truncate block">{segment.label}</BreadcrumbPage>
                                                )}
                                            </BreadcrumbItem>
                                            {index < segments.length - 1 && (
                                                <BreadcrumbSeparator className="hidden md:block" />
                                            )}
                                        </React.Fragment>
                                    ));
                                })()}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <ThemeToggle />
                    </div>
                </header>
                <div className={cn("flex flex-1 min-h-0 flex-col gap-4 p-4 pt-0 max-w-7xl mx-auto w-full", constrainToViewport && "overflow-y-auto", {
                    "p-0 gap-0 max-w-none": path === '/admin/content' || path === '/content' || path.match(/\/learning\/chapter\/\d+/) || path.match(/\/admin\/tracks\/.+/) || path.match(/\/content\/tracks\/.+/)
                })}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
