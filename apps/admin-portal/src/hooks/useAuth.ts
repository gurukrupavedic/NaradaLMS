"use client" // This must be a client hook

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";
import { AUTH_ME_QUERY_KEY } from "../lib/org-switcher";

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

export interface MembershipSummary {
    membershipId: string;
    orgId: string;
    orgSlug: string;
    orgName: string;
    roles: string[];
    status: string;
}

export interface AuthSession extends AuthUser {
    memberships: MembershipSummary[];
    hasActiveMembership: boolean;
    /** From `GET /api/auth/me` when the API exposes Slice 1 field. */
    canAccessAdminPortal?: boolean;
}

export function useAuth() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const {
        data: userData,
        isLoading,
        error,
    } = useQuery({
        queryKey: AUTH_ME_QUERY_KEY,
        queryFn: async () => {
            try {
                const response = await apiRequest("/auth/me") as {
                    user: AuthUser;
                    memberships?: MembershipSummary[];
                    hasActiveMembership?: boolean;
                    canAccessAdminPortal?: boolean;
                };
                const u = response.user as AuthUser;
                return {
                    ...u,
                    memberships: (response.memberships ?? []) as MembershipSummary[],
                    hasActiveMembership: Boolean(response.hasActiveMembership),
                    ...(typeof response.canAccessAdminPortal === "boolean"
                        ? { canAccessAdminPortal: response.canAccessAdminPortal }
                        : {}),
                } satisfies AuthSession;
            } catch (err: unknown) {
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
            queryClient.setQueryData(AUTH_ME_QUERY_KEY, null);
            queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
            router.push("/");
        } catch (err) {
            console.error("Logout error", err);
        }
    };

    return {
        user: (userData as AuthSession | null) || null,
        isLoading,
        isAuthenticated: !!userData,
        logout,
    };
}
