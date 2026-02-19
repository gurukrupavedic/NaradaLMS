"use client";

import { useAuth } from "@/hooks/useAuth";
import { AppShell, UserRole } from "@narada/ui";
import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getOpsNavigationForRole, contextualNavigation } from "@/lib/ops-navigation-config";

interface OpsLayoutProps {
    children: ReactNode;
    /** If true, use the user's actual roles. If false, show all ops roles. */
    useActualRoles?: boolean;
    /** Whether to include contextual navigation (e.g., for instructor pages) */
    showContextualNav?: boolean;
    /** Optional label for content chapter context (e.g. "Track 1. Chapter 3") */
    contentContextLabel?: string | null;
}

export default function OpsLayout({
    children,
    useActualRoles = false,
    showContextualNav = false,
    contentContextLabel = null,
}: OpsLayoutProps) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [user, isLoading, router]);

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

    // Ops portal is admin-only; redirect non-admins
    if (!user.roles?.includes('admin')) {
        router.push("/");
        return null;
    }

    const portalRoles: UserRole[] = ['admin'];
    const opsNavigation = getOpsNavigationForRole(portalRoles);

    // Map AuthUser to AppShell user shape (name, email, avatar)
    const shellUser = {
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
        email: user.email,
        avatar: user.profileImageUrl ?? "",
    };

    return (
        <AppShell
            user={shellUser}
            userRoles={portalRoles}
            customNavigation={opsNavigation}
            contextualNavigation={showContextualNav ? contextualNavigation : undefined}
            contentContextLabel={contentContextLabel}
            homeHref="/admin"
            onLogout={logout}
        >
            {children}
        </AppShell>
    );
}
