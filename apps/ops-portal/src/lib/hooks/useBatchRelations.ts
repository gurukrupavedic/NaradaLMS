'use client';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export type CoInstructor = {
    id: number;
    instructorId: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
};

export function useCoInstructors(batchId: number, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ["batch", batchId, "co-instructors"],
        queryFn: () => apiRequest<CoInstructor[]>(`/batches/${batchId}/co-instructors`),
        enabled: options?.enabled,
    });
}

export type Instructor = {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string
};

export function useInstructors() {
    return useQuery({
        queryKey: ["instructors"],
        queryFn: () => apiRequest<{ users: Instructor[] }>("/auth/admin/users?role=instructor"),
        select: (data) => data.users
    });
}
