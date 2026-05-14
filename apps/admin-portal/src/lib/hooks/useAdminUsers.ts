'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export type AdminUser = {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
    status: 'active' | 'inactive' | 'pending_approval';
    createdAt: string;
};

export type AdminUsersResponse = {
    users: AdminUser[];
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
    };
};

export function useAdminUsers(params: { limit: number; offset: number; status?: string; search?: string }) {
    const queryFn = async () => {
        const searchParams = new URLSearchParams({
            limit: params.limit.toString(),
            offset: params.offset.toString(),
        });
        if (params.status) searchParams.append('status', params.status);
        if (params.search?.trim()) searchParams.append('search', params.search.trim());

        const response = await apiRequest<AdminUsersResponse>(`/auth/admin/users?${searchParams.toString()}`);
        return response;
    };

    return useQuery({
        queryKey: ['admin-users', params],
        queryFn,
    });
}

export function useApproveUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => apiRequest(`/auth/admin/users/${userId}/approve`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    });
}

export function useRejectUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => apiRequest(`/auth/admin/users/${userId}/reject`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    });
}

export function useAssignRoles() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, roles }: { userId: string; roles: string[] }) =>
            apiRequest(`/auth/admin/users/${userId}/roles`, {
                method: 'POST',
                body: JSON.stringify({ roles })
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    });
}

export function useUserStatusMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, action }: { userId: string; action: 'enable' | 'disable' }) =>
            apiRequest(`/auth/admin/users/${userId}/${action}`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    });
}
