"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useState, useEffect } from "react";

export type CoInstructor = {
    id: number;
    batchId: number;
    instructorId: string;
    role: string;
    assignedAt?: string;
    assignedBy?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
};

export type Enrollment = {
    id: number;
    batchId: number;
    studentId: string;
    status: string;
    enrolledAt?: string;
    droppedAt?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
};

export type EligibleStudent = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    roles: string[];
};

export type Instructor = {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
};

export function useCoInstructors(batchId: number, options?: { enabled?: boolean }) {
    return useQuery<CoInstructor[]>({
        queryKey: [`/batches/${batchId}/co-instructors`],
        queryFn: async () => {
            const res = await apiRequest<unknown>(`/batches/${batchId}/co-instructors`);
            if (Array.isArray(res)) return res;
            if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: unknown }).data))
                return (res as { data: CoInstructor[] }).data;
            if (res && typeof res === "object" && "items" in res && Array.isArray((res as { items: unknown }).items))
                return (res as { items: CoInstructor[] }).items;
            return [];
        },
        enabled: options?.enabled ?? true,
    });
}

export function useInstructors() {
    return useQuery<Instructor[]>({
        queryKey: ["instructors"],
        queryFn: async () => {
            const response = await apiRequest<{ users: unknown[] }>("/auth/admin/users?role=instructor&limit=200");
            return ((response.users || []) as { id: string; firstName?: string; lastName?: string; email: string }[]).map((u) => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
            }));
        },
    });
}

export function useEnrollments(batchId: number) {
    return useQuery<Enrollment[]>({
        queryKey: [`/batches/${batchId}/enrollments`],
        queryFn: async () => {
            const res = await apiRequest<unknown>(`/batches/${batchId}/enrollments`);
            if (Array.isArray(res)) return res;
            if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: unknown }).data))
                return (res as { data: Enrollment[] }).data;
            if (res && typeof res === "object" && "items" in res && Array.isArray((res as { items: unknown }).items))
                return (res as { items: Enrollment[] }).items;
            return [];
        },
    });
}

export function useEligibleStudents(batchId: number, searchQuery: string) {
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return useQuery<EligibleStudent[]>({
        queryKey: [`/batches/${batchId}/eligible-students`, debouncedSearch],
        queryFn: async () => {
            const url = debouncedSearch
                ? `/batches/${batchId}/eligible-students?search=${encodeURIComponent(debouncedSearch)}`
                : `/batches/${batchId}/eligible-students`;
            const res = await apiRequest<unknown>(url);
            if (Array.isArray(res)) return res;
            if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: unknown }).data))
                return (res as { data: EligibleStudent[] }).data;
            if (res && typeof res === "object" && "items" in res && Array.isArray((res as { items: unknown }).items))
                return (res as { items: EligibleStudent[] }).items;
            return [];
        },
        enabled: true,
    });
}

export function useDropEnrollment(batchId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ enrollmentId }: { enrollmentId: number }) => {
            return apiRequest(`/enrollments/${enrollmentId}/drop`, { method: "PATCH" });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [`/batches/${batchId}/enrollments`] });
        },
    });
}
