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
}

export function AppShell({ children, user, userRoles, onLogout, homeHref = "/app" }: AppShellProps) {
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
                                    <BreadcrumbLink href="#">
                                        App
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Vedic Learning</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
