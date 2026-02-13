'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export type Batch = {
    id: number;
    batchCode: string;
    batchName: string;
    trackId?: number | null;
    primaryInstructorId?: string | null;
    cohortType?: string | null;
    description?: string | null;
    studentCount?: number;
    createdAt?: string;
    updatedAt?: string;
};

export type BatchPaginationParams = {
    limit?: number;
    offset?: number;
};

export function useBatches(params?: BatchPaginationParams & { endpoint?: string }) {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const endpoint = params?.endpoint ?? '/batches';

    return useQuery({
        queryKey: ["batches", limit, offset, endpoint],
        queryFn: async () => {
            // Using the proxy at /api/batches which forwards to Monolith
            return apiRequest<{ items: Batch[]; pagination: { limit: number; offset: number; total: number } }>(
                `${endpoint}?limit=${limit}&offset=${offset}`
            );
        },
    });
}

export function useCreateBatch() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => apiRequest("/batches", { method: "POST", body: JSON.stringify(payload) }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["batches"] });
        },
    });
}

export function useUpdateBatch() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: any }) =>
            apiRequest(`/batches/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
        onSuccess: (data, variables) => {
            qc.invalidateQueries({ queryKey: ["batches"] });
            qc.invalidateQueries({ queryKey: [`batch`, variables.id] });
        },
    });
}

export function useDeleteBatch() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => apiRequest(`/batches/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["batches"] });
        },
    });
}
