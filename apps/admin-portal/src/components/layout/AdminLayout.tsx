"use client";

import { useAuth } from "@/hooks/useAuth";
import { AppShell, UserRole, useToast } from "@narada/ui";
import { useEffect, ReactNode, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    getAdminNavigationForAccess,
    contextualNavigation,
} from "@/lib/admin-navigation-config";
import { AdminOrgSwitcher } from "./AdminOrgSwitcher";
import {
    canAccessAdminPortalFromSession,
    hasOrgAdminAnywhere,
    isOrgScopedAdminPath,
    isUsersAdminPath,
} from "@/lib/admin-portal-access";

interface AdminLayoutProps {
    children: ReactNode;
    /** If true, use the user's actual roles. If false, show all admin roles. */
    useActualRoles?: boolean;
    /** Whether to include contextual navigation (e.g., for instructor pages) */
    showContextualNav?: boolean;
    /** Optional label for content chapter context (e.g. "Track 1. Chapter 3") */
    contentContextLabel?: string | null;
}

export default function AdminLayout({
    children,
    useActualRoles: _useActualRoles = false,
    showContextualNav = false,
    contentContextLabel = null,
}: AdminLayoutProps) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const deepLinkHandledRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (isLoading || !user || !pathname) {
            return;
        }
        const hasOrgAdmin = hasOrgAdminAnywhere(user.memberships);
        const redirectKey = `${pathname}:${user.id}`;
        if (isUsersAdminPath(pathname) && !user.isSuperAdmin) {
            if (deepLinkHandledRef.current !== redirectKey) {
                deepLinkHandledRef.current = redirectKey;
                toast({
                    title: "Access denied",
                    description: "User management requires platform administrator access.",
                    variant: "destructive",
                });
            }
            router.replace("/admin");
            return;
        }
        if (isOrgScopedAdminPath(pathname) && !hasOrgAdmin) {
            if (deepLinkHandledRef.current !== redirectKey) {
                deepLinkHandledRef.current = redirectKey;
                toast({
                    title: "Access denied",
                    description:
                        "This area requires organization administrator access.",
                    variant: "destructive",
                });
            }
            router.replace("/admin");
        }
    }, [isLoading, user, pathname, router, toast]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const portalAllowed = canAccessAdminPortalFromSession({
        isSuperAdmin: user.isSuperAdmin,
        memberships: user.memberships,
        canAccessAdminPortal: user.canAccessAdminPortal,
    });
    if (!portalAllowed) {
        router.push("/");
        return null;
    }

    const hasOrgAdmin = hasOrgAdminAnywhere(user.memberships);
    const adminNavigation = getAdminNavigationForAccess({
        isSuperAdmin: user.isSuperAdmin,
        hasOrgAdminAnywhere: hasOrgAdmin,
    });

    const portalRoles: UserRole[] = ["admin"];

    const shellUser = {
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
        email: user.email,
        avatar: user.profileImageUrl ?? "",
    };

    return (
        <AppShell
            user={shellUser}
            userRoles={portalRoles}
            customNavigation={adminNavigation}
            contextualNavigation={showContextualNav ? contextualNavigation : undefined}
            contentContextLabel={contentContextLabel}
            homeHref="/admin"
            onLogout={logout}
            headerActions={
                isUsersAdminPath(pathname) ? undefined : (
                    <AdminOrgSwitcher
                        memberships={user.memberships}
                        currentOrgId={user.currentOrgId}
                        isSuperAdmin={user.isSuperAdmin}
                    />
                )
            }
        >
            {children}
        </AppShell>
    );
}
