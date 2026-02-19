"use client";

import { AppShell } from "@narada/ui";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@narada/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ContentContextLabelContext } from "@/lib/learning/ContentContextLabelContext";

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [contentContextLabel, setContentContextLabel] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [isLoading, user, router]);

    useEffect(() => {
        if (pathname && !pathname.match(/\/learning\/chapter\/\d+/)) {
            setContentContextLabel(null);
        }
    }, [pathname]);

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
        <ContentContextLabelContext.Provider value={{ setLabel: setContentContextLabel }}>
            <AppShell
                user={{
                    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
                    email: user.email,
                    avatar: user.profileImageUrl || ""
                }}
                userRoles={['student']}
                onLogout={logout}
                homeHref="/vedic-learning"
                contentContextLabel={contentContextLabel}
            >
                {children}
            </AppShell>
        </ContentContextLabelContext.Provider>
    );
}
