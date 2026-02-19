"use client";

import { AppShell } from "@narada/ui";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@narada/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { ContentContextLabelContext } from "@/lib/learning/ContentContextLabelContext";

/** Roles that can see nav sections in the student portal. Only Learn + Batches & Progress. No admin/content sections. */
const STUDENT_PORTAL_NAV_ROLES = ["student", "instructor"] as const;

const instructorContextualNavigation = new Map([
    ["/instructor/students/:id", {
        label: "Student Progress",
        parentPath: "/instructor/students",
        breadcrumbs: [
            { label: "My Students", href: "/instructor/students" },
            { label: "Progress", href: "#" }
        ]
    }],
    ["/instructor/batches/:id", {
        label: "Batch Details",
        parentPath: "/instructor/batches",
        breadcrumbs: [
            { label: "My Batches", href: "/instructor/batches" },
            { label: "Details", href: "#" }
        ]
    }],
]);

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

    // Student portal only shows Learn + Batches & Progress. We pass only STUDENT_PORTAL_NAV_ROLES
    // so the shared AppShell/sidebar never shows Tracks & Chapters or Admin Center here.
    const userRoles = useMemo(() => {
        const roles = (user?.roles ?? ["student"]) as string[];
        const allowed = roles.filter((r): r is "student" | "instructor" =>
            STUDENT_PORTAL_NAV_ROLES.includes(r as (typeof STUDENT_PORTAL_NAV_ROLES)[number])
        );
        return allowed.length > 0 ? [...allowed] : ["student"];
    }, [user?.roles]);

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
                userRoles={userRoles}
                onLogout={logout}
                homeHref="/vedic-learning"
                contentContextLabel={contentContextLabel}
                contextualNavigation={instructorContextualNavigation}
            >
                {children}
            </AppShell>
        </ContentContextLabelContext.Provider>
    );
}
