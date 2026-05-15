"use client";

import { AppShell, type UserRole } from "@narada/ui";
import { useAuth, type AuthSession } from "@/hooks/useAuth";
import { getStudentShellBranding } from "@/lib/tenant";
import { LoadingSpinner, useToast } from "@narada/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { ContentContextLabelContext } from "@narada/ui";

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
    const { user, isLoading, logout, switchOrg } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [contentContextLabel, setContentContextLabel] = useState<string | null>(null);
    const [isTenantOrgSwitching, setIsTenantOrgSwitching] = useState(false);
    const [failedAutoSwitchOrgId, setFailedAutoSwitchOrgId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [isLoading, user, router]);

    useEffect(() => {
        if (isLoading || !user) return;
        const session = user as AuthSession;
        const onPendingPage = pathname?.startsWith("/pending-approval");
        if (
            session.currentTenantSwitchOrgId &&
            session.currentTenantSwitchOrgId !== failedAutoSwitchOrgId &&
            !isTenantOrgSwitching
        ) {
            setIsTenantOrgSwitching(true);
            void switchOrg(session.currentTenantSwitchOrgId)
                .catch((error) => {
                    console.error("Tenant org switch failed", error);
                    setFailedAutoSwitchOrgId(session.currentTenantSwitchOrgId ?? null);
                    toast({
                        title: "Could not switch organizations",
                        description:
                            "We could not switch into the current tenant automatically. Please refresh or sign in again.",
                        variant: "destructive",
                    });
                })
                .finally(() => {
                    setIsTenantOrgSwitching(false);
                });
            return;
        }
        if (!session.currentTenantSwitchOrgId && failedAutoSwitchOrgId) {
            setFailedAutoSwitchOrgId(null);
        }
        if (session.currentTenantAccessState === "active" && onPendingPage) {
            router.replace("/my-learning");
            return;
        }
        if (
            !session.isSuperAdmin &&
            session.currentTenantAccessState !== "active" &&
            !onPendingPage
        ) {
            router.replace("/pending-approval");
        }
    }, [
        failedAutoSwitchOrgId,
        isLoading,
        isTenantOrgSwitching,
        pathname,
        router,
        switchOrg,
        toast,
        user,
    ]);

    useEffect(() => {
        if (pathname && !pathname.match(/\/learning\/chapter\/\d+/)) {
            setContentContextLabel(null);
        }
    }, [pathname]);

    // Student portal only shows Learn + Batches & Progress. We pass only STUDENT_PORTAL_NAV_ROLES
    // so the shared AppShell/sidebar never shows Content Studio or Admin Center here.
    const userRoles: UserRole[] = useMemo(() => {
        const roles = (user?.orgRoles?.length ? user.orgRoles : ["student"]) as string[];
        const allowed = roles.filter((r): r is "student" | "instructor" =>
            STUDENT_PORTAL_NAV_ROLES.includes(r as (typeof STUDENT_PORTAL_NAV_ROLES)[number])
        );
        return (allowed.length > 0 ? [...allowed] : ["student"]) as UserRole[];
    }, [user?.orgRoles]);
    const brandHeaderBranding = useMemo(() => {
        const tenantBranding = getStudentShellBranding();
        return {
            name: tenantBranding.displayName,
            logoSrc: tenantBranding.logoPath,
            iconSrc: tenantBranding.iconPath,
            logoAlt: tenantBranding.logoAlt,
            iconAlt: tenantBranding.logoAlt,
        };
    }, []);

    if (isLoading || isTenantOrgSwitching) {
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
                homeHref="/my-learning"
                profileHref="/profile"
                settingsHref="/settings"
                contentContextLabel={contentContextLabel}
                contextualNavigation={instructorContextualNavigation}
                documentScrollPaths={["/my-learning", "/instructor/students"]}
                brandHeaderBranding={brandHeaderBranding}
            >
                {children}
            </AppShell>
        </ContentContextLabelContext.Provider>
    );
}
