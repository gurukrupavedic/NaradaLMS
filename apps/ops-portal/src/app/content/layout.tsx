"use client";

import { useAuth } from "@/hooks/useAuth";
import { AppShell, UserRole } from "@narada/ui";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOpsNavigationForRole } from "@/lib/ops-navigation-config";

export default function ContentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    // Content manager role for navigation
    const portalRoles: UserRole[] = ['admin', 'instructor', 'content_manager'];

    // Get portal-specific navigation
    const opsNavigation = getOpsNavigationForRole(portalRoles);

    return (
        <AppShell
            user={user as any}
            userRoles={portalRoles}
            customNavigation={opsNavigation}
            onLogout={logout}
        >
            {children}
        </AppShell>
    );
}
