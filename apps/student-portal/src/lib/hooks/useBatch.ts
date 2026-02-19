"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export type BatchDetail = {
    id: number;
    batchCode: string;
    batchName: string;
    trackId?: number | null;
    trackName?: string | null;
    cohortType?: string | null;
    description?: string | null;
    studentCount?: number;
    startDate?: string;
    endDate?: string;
    maxStudents?: number;
    status?: string;
    primaryInstructorId?: string | null;
    primaryInstructorName?: string | null;
    coInstructorNames?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export function useBatch(batchId?: number) {
    return useQuery<BatchDetail | null>({
        queryKey: batchId ? ["/batches", batchId] : ["/batches", "none"],
        queryFn: async () => {
            if (!batchId) return null;
            return apiRequest<BatchDetail>(`/batches/${batchId}`);
        },
        enabled: Boolean(batchId),
    });
}
