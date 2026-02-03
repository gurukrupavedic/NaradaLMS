"use client";

import { AppShell } from "@narada/ui";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@narada/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PortalLayout({
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
    }, [isLoading, user, router]);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <AppShell
            user={{
                name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
                email: user.email,
                avatar: user.profileImageUrl || ""
            }}
            userRoles={user.roles as any}
            onLogout={logout}
            homeHref="/vedic-learning"
        >
            {children}
        </AppShell>
    );
}
