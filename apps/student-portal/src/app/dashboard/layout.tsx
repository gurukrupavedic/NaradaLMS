"use client";

import { useAuth } from "@/hooks/useAuth";
import { AppShell, UserRole } from "@narada/ui";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();

    // Protect the route
    useEffect(() => {
        if (!isLoading && !user) {
            // Redirect to login if not authenticated
            // For now, assuming monolith login page or a new one
            window.location.href = "http://localhost:5000/login"; // Redirect to monolith login for now as shared auth page isn't up
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    // Force 'student' role for sidebar configuration regardless of actual roles
    // effectively hiding other sections for this portal
    const portalRoles: UserRole[] = ['student'];

    return (
        <AppShell
            user={user as any}
            userRoles={portalRoles}
            onLogout={logout}
        >
            {children}
        </AppShell>
    );
}
