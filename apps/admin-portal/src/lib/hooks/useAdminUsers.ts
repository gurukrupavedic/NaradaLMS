'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import {
    buildAdminUsersSearchParams,
    type AdminUserOrgFilter,
    type AdminUserStatusFilter,
} from '@/lib/admin-user-filters';

export type GovernanceMembership = {
    membershipId: string;
    orgId: string;
    orgSlug: string;
    orgName: string;
    roles: string[];
    status: string;
};

export type GovernanceUser = {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    isSuperAdmin: boolean;
    memberships: GovernanceMembership[];
};

export type AdminUsersResponse = {
    users: GovernanceUser[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
    };
    statusCounts: {
        all: number;
        pending: number;
        active: number;
        inactive: number;
        rejected: number;
    };
};

export function useAdminUsers(params: {
    limit: number;
    offset: number;
    /** Tab: all | pending | active | inactive | rejected */
    status?: AdminUserStatusFilter;
    search?: string;
    orgSlug?: AdminUserOrgFilter;
}) {
    const queryFn = async () => {
        const searchParams = buildAdminUsersSearchParams(params);
        const response = await apiRequest<AdminUsersResponse>(
            `/auth/admin/users?${searchParams.toString()}`
        );
        return response;
    };

    return useQuery({
        queryKey: ['admin-users', params],
        queryFn,
        enabled: true,
    });
}

export function useApproveMembership() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (membershipId: string) =>
            apiRequest(`/auth/admin/memberships/${membershipId}/approve`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    });
}

export function useRejectMembership() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (membershipId: string) =>
            apiRequest(`/auth/admin/memberships/${membershipId}/reject`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    });
}

export function usePatchMembershipRoles() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ membershipId, roles }: { membershipId: string; roles: string[] }) =>
            apiRequest(`/auth/admin/memberships/${membershipId}/roles`, {
                method: 'PATCH',
                body: JSON.stringify({ roles }),
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    });
}

export function useMembershipEnableDisable() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            membershipId,
            action,
        }: {
            membershipId: string;
            action: 'enable' | 'disable';
        }) =>
            apiRequest(`/auth/admin/memberships/${membershipId}/${action}`, {
                method: 'POST',
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    });
}
