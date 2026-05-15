'use client';

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@narada/ui";
import type { LucideIcon } from "lucide-react";
import { Users, FileText, Settings, BookOpen, LibraryBig } from "lucide-react";
import Link from 'next/link';
import { useAuth } from "@/hooks/useAuth";
import { hasOrgAdminAnywhere } from "@/lib/admin-portal-access";

type DashboardLink = {
    title: string;
    icon: LucideIcon;
    href: string;
    description: string;
    requiresSuperAdmin: boolean;
    requiresOrgAdmin: boolean;
};

const ALL_ADMIN_LINKS: DashboardLink[] = [
    {
        title: "User Management",
        icon: Users,
        href: "/admin/users",
        description: "Manage students, instructors, and admins.",
        requiresSuperAdmin: true,
        requiresOrgAdmin: false,
    },
    {
        title: "Batch Management",
        icon: BookOpen,
        href: "/admin/batches",
        description: "Create and manage learning batches.",
        requiresSuperAdmin: false,
        requiresOrgAdmin: true,
    },
    {
        title: "Content Studio",
        icon: LibraryBig,
        href: "/admin/content",
        description: "Manage tracks, chapters, and curriculum.",
        requiresSuperAdmin: false,
        requiresOrgAdmin: true,
    },
    {
        title: "Audit Logs",
        icon: FileText,
        href: "/admin/logs",
        description: "View system activity and security logs.",
        requiresSuperAdmin: false,
        requiresOrgAdmin: true,
    },
    {
        title: "System Settings",
        icon: Settings,
        href: "/admin/settings",
        description: "Configure global platform settings.",
        requiresSuperAdmin: false,
        requiresOrgAdmin: true,
    },
];

export default function AdminDashboard() {
    const { user, isLoading } = useAuth();

    const visibleLinks = useMemo(() => {
        if (!user) {
            return [];
        }
        const orgAdmin = hasOrgAdminAnywhere(user.memberships);
        return ALL_ADMIN_LINKS.filter((link) => {
            if (link.requiresSuperAdmin && !user.isSuperAdmin) {
                return false;
            }
            if (link.requiresOrgAdmin && !orgAdmin) {
                return false;
            }
            return true;
        });
    }, [user]);

    if (isLoading) {
        return (
            <div className="p-8">
                <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>

            {visibleLinks.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {visibleLinks.map((link) => (
                        <Link key={link.href} href={link.href}>
                            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {link.title}
                                    </CardTitle>
                                    <link.icon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">
                                        {link.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Admin stats will appear here.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
