"use client" // This must be a client hook

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";
import { getCurrentTenantSlug } from "../lib/tenant";
import {
    getCurrentTenantMembership,
    getTenantAccessState,
    getTenantSwitchOrgId,
    type TenantAccessState,
    type TenantMembershipSummary,
} from "../lib/tenant-session";

export type OrgMembershipStatusClient =
    | "pending"
    | "active"
    | "inactive"
    | "rejected";

/** Session user from JWT (`/auth/me`) plus optional profile fields when merged from APIs. */
export interface AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    isSuperAdmin: boolean;
    currentOrgId?: string;
    orgRoles?: string[];
    orgMembershipStatus?: OrgMembershipStatusClient;
    createdAt?: string;
    updatedAt?: string;
}

export interface MembershipSummary extends TenantMembershipSummary {}

/** `/auth/me` payload: session user plus membership list from the server. */
export interface AuthSession extends AuthUser {
    memberships: MembershipSummary[];
    hasActiveMembership: boolean;
    currentTenantMembership: MembershipSummary | null;
    currentTenantAccessState: TenantAccessState;
    currentTenantSwitchOrgId: string | null;
}

export function useAuth() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const {
        data: userData,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["auth", "me"],
        queryFn: async () => {
            try {
                const response = await apiRequest("/auth/me");
                const u = response.user as AuthUser;
                const memberships = (response.memberships ?? []) as MembershipSummary[];
                const hasActiveMembership = Boolean(response.hasActiveMembership);
                const tenantScopedSession = {
                    currentOrgId: u.currentOrgId,
                    memberships,
                    hasActiveMembership,
                    isSuperAdmin: u.isSuperAdmin,
                };
                const tenantSlug = getCurrentTenantSlug();

                return {
                    ...u,
                    memberships,
                    hasActiveMembership,
                    currentTenantMembership: getCurrentTenantMembership(
                        tenantScopedSession,
                        tenantSlug
                    ),
                    currentTenantAccessState: getTenantAccessState(
                        tenantScopedSession,
                        tenantSlug
                    ),
                    currentTenantSwitchOrgId: getTenantSwitchOrgId(
                        tenantScopedSession,
                        tenantSlug
                    ),
                } satisfies AuthSession;
            } catch (err: unknown) {
                // 401 means not authenticated — this is expected
                // Other errors (network, 500) should propagate so React Query can retry
                const message = err instanceof Error ? err.message : String(err);
                if (message.includes('401') || message.includes('Unauthorized')) {
                    return null;
                }
                throw err;
            }
        },
        retry: (failureCount, error) => {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('401') || message.includes('Unauthorized')) {
                return false;
            }
            return failureCount < 2;
        },
    });

    const logout = async () => {
        try {
            await apiRequest("/auth/logout", { method: "POST" });
            queryClient.setQueryData(["auth", "me"], null);
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
            router.push("/");
        } catch (err) {
            console.error("Logout error", err);
        }
    };

    const switchOrg = async (orgId: string) => {
        await apiRequest("/auth/switch-org", {
            method: "POST",
            body: JSON.stringify({ orgId }),
        });
        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    };

    return {
        user: (userData as AuthSession | null) || null,
        isLoading,
        isAuthenticated: !!userData,
        logout,
        switchOrg,
    };
}
