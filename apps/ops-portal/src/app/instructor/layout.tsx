"use client";

import { useAuth } from "@/hooks/useAuth";
import { AppShell, UserRole } from "@narada/ui";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOpsNavigationForRole, contextualNavigation } from "@/lib/ops-navigation-config";

export default function InstructorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
            return;
        }

        // Basic role check - ideally middleware handles this too
        if (user && !user.roles.includes('instructor') && !user.roles.includes('admin')) {
            // If not instructor or admin, maybe redirect? 
            // For now let's assume if they got here they are allowed or we show empty.
            // But let's be strict:
            // router.push('/admin'); // Redirect to admin if they are admin?
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    // Force instructor role to show relevant navigation
    // Use actual user roles to determine which sections to show (Admin, Content, etc.)
    const portalRoles = user.roles.filter((role: string) =>
        ['instructor', 'admin', 'content_manager'].includes(role)
    ) as UserRole[];

    // Fallback if no relevant roles found (should be handled by redirect above but safety first)
    if (portalRoles.length === 0) portalRoles.push('instructor');

    // Get portal-specific navigation
    // Get portal-specific navigation
    const opsNavigation = getOpsNavigationForRole(portalRoles);

    return (
        <AppShell
            user={user as any}
            userRoles={portalRoles}
            customNavigation={opsNavigation}
            contextualNavigation={contextualNavigation}
            onLogout={logout}
        >
            {children}
        </AppShell>
    );
}
