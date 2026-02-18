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
}

export function AppShell({ children, user, userRoles, onLogout, homeHref = "/app", customNavigation, contextualNavigation, contentContextLabel }: AppShellProps) {
    // We need to pass currentPath to Sidebar for active state
    // Since this is in @narada/ui, we assume usage in Next.js app context
    const pathname = usePathname()

    return (
        <SidebarProvider>
            <AppSidebar
                user={user}
                userRoles={userRoles}
                onLogout={onLogout}
                currentPath={pathname}
                homeHref={homeHref}
                customNavigation={customNavigation}
                contextualNavigation={contextualNavigation}
                contentContextLabel={contentContextLabel}
            />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b bg-background px-4">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        {/* Breadcrumbs can be enhanced later to be dynamic based on pathname */}
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href={homeHref} aria-label="Home">
                                        <Home className="h-4 w-4" />
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                {(() => {
                                    // Simple path-based breadcrumb generation
                                    let segments: { label: string, href?: string }[] = [];

                                    if (pathname === '/vedic-learning' || pathname === '/app/learning') {
                                        segments = [{ label: 'Vedic Learning' }];
                                    } else if (pathname.match(/\/learning\/chapter\/\d+/)) {
                                        segments = [
                                            { label: 'Vedic Learning', href: '/vedic-learning' },
                                            { label: 'Learn Chapter' }
                                        ];
                                    } else if (pathname.startsWith('/admin')) {
                                        segments = [{ label: 'Admin Center', href: '/admin' }];
                                        if (pathname.includes('/users')) segments.push({ label: 'Users', href: '/admin/users' });
                                        if (pathname.includes('/batches')) {
                                            segments.push({ label: 'Batches', href: '/admin/batches' });
                                            if (pathname.match(/\/batches\/\d+/)) {
                                                segments.push({ label: 'Batch Details' });
                                            }
                                        }
                                        if (pathname.includes('/logs')) segments.push({ label: 'Audit Logs', href: '/admin/logs' });
                                        if (pathname.includes('/settings')) segments.push({ label: 'Settings', href: '/admin/settings' });
                                    } else if (pathname.startsWith('/instructor')) {
                                        segments = [{ label: 'Batches & Progress', href: '/instructor/batches' }];
                                        if (pathname.includes('/batches')) {
                                            segments.push({ label: 'My Batches', href: '/instructor/batches' });
                                            if (pathname.match(/\/instructor\/batches\/[^/]+/)) {
                                                segments.push({ label: 'Batch Details' });
                                            }
                                        }
                                        if (pathname.includes('/students')) {
                                            segments.push({ label: 'My Students', href: '/instructor/students' });
                                            if (pathname.match(/\/instructor\/students\/[^/]+/)) {
                                                segments.push({ label: 'Student Progress' });
                                            }
                                        }
                                    } else if (pathname.startsWith('/content')) {
                                        segments = [{ label: 'Content Studio', href: '/content' }];
                                        const tracksMatch = pathname.match(/\/content\/tracks\/([^/]+)/);
                                        const chaptersMatch = pathname.match(/\/content\/tracks\/[^/]+\/chapters\/([^/]+)/);
                                        if (!tracksMatch) {
                                            segments.push({ label: 'Tracks & Chapters' });
                                        } else {
                                            segments.push({ label: 'Tracks & Chapters', href: chaptersMatch ? '/content' : undefined });
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
                                            <BreadcrumbItem>
                                                {segment.href ? (
                                                    <BreadcrumbLink href={segment.href}>
                                                        {segment.label}
                                                    </BreadcrumbLink>
                                                ) : (
                                                    <BreadcrumbPage>{segment.label}</BreadcrumbPage>
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
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </header>
                <div className={cn("flex flex-1 min-h-0 flex-col gap-4 p-4 pt-0 max-w-7xl mx-auto w-full", {
                    "p-0 gap-0 max-w-none": pathname === '/content' || pathname.match(/\/learning\/chapter\/\d+/) || pathname.match(/\/content\/tracks\/.+/)
                })}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
