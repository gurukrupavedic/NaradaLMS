'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

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
    legacyStatus: string;
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
        pending_approval: number;
        active: number;
        inactive: number;
        rejected: number;
    };
};

export function useAdminUsers(params: {
    limit: number;
    offset: number;
    /** Tab: all | pending_approval | active | inactive | rejected */
    status?: string;
    search?: string;
}) {
    const queryFn = async () => {
        const searchParams = new URLSearchParams({
            limit: params.limit.toString(),
            offset: params.offset.toString(),
        });
        if (params.search?.trim()) searchParams.append('search', params.search.trim());
        if (params.status && params.status !== 'all') {
            const map: Record<string, string> = {
                pending_approval: 'pending',
                active: 'active',
                inactive: 'inactive',
                rejected: 'rejected',
            };
            const ms = map[params.status];
            if (ms) searchParams.append('membershipStatus', ms);
        }
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
