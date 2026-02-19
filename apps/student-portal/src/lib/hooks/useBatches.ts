"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

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
    const endpoint = params?.endpoint ?? "/batches";

    return useQuery({
        queryKey: ["batches", limit, offset, endpoint],
        queryFn: async () => {
            return apiRequest<{ items: Batch[]; pagination: { limit: number; offset: number; total: number } }>(
                `${endpoint}?limit=${limit}&offset=${offset}`
            );
        },
    });
}
