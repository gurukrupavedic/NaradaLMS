"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Role guard - redirects to home if user does not have one of the required roles.
 */
export function useRoleGuard(requiredRoles: string[]) {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            router.push("/");
            return;
        }
        const hasRequiredRole =
            user.isSuperAdmin ||
            requiredRoles.some((role) => user.orgRoles?.includes(role));
        if (!hasRequiredRole) {
            router.push("/vedic-learning");
        }
    }, [user, isLoading, requiredRoles, router]);
}
