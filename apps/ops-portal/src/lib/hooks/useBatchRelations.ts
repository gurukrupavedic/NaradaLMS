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
    status: string; // active, dropped, completed
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

export function useCoInstructors(batchId: number, options?: { enabled?: boolean }) {
    return useQuery<CoInstructor[]>({
        queryKey: [`/batches/${batchId}/co-instructors`],
        queryFn: async () => {
            const res = await apiRequest<any>(`/batches/${batchId}/co-instructors`);
            if (Array.isArray(res)) return res;
            if (res.data && Array.isArray(res.data)) return res.data;
            if (res.items && Array.isArray(res.items)) return res.items;
            return [];
        },
        enabled: options?.enabled ?? true,
    });
}

export function useAssignCoInstructor(batchId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ instructorId, role }: { instructorId: string; role?: string }) => {
            return apiRequest(
                `/batches/${batchId}/co-instructors`,
                {
                    method: "POST",
                    body: JSON.stringify({ instructorId, role }),
                }
            );
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [`/batches/${batchId}/co-instructors`] });
        },
    });
}

export function useRemoveCoInstructor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ assignmentId, batchId }: { assignmentId: number; batchId: number }) => {
            await apiRequest(`/co-instructors/${assignmentId}`, { method: "DELETE" });
            return { batchId };
        },
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: [`/batches/${variables.batchId}/co-instructors`] });
        },
    });
}

export function useEnrollments(batchId: number) {
    return useQuery<Enrollment[]>({
        queryKey: [`/batches/${batchId}/enrollments`],
        queryFn: async () => {
            const res = await apiRequest<any>(`/batches/${batchId}/enrollments`);
            if (Array.isArray(res)) return res;
            if (res.data && Array.isArray(res.data)) return res.data;
            if (res.items && Array.isArray(res.items)) return res.items;
            return [];
        },
    });
}

export function useEnrollStudent(batchId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ studentId }: { studentId: string }) => {
            return apiRequest(
                `/batches/${batchId}/enrollments`,
                {
                    method: "POST",
                    body: JSON.stringify({ studentId }),
                }
            );
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [`/batches/${batchId}/enrollments`] });
        },
    });
}

export function useDropEnrollment(batchId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ enrollmentId }: { enrollmentId: number }) => {
            return apiRequest(
                `/enrollments/${enrollmentId}/drop`,
                { method: "PATCH" }
            );
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [`/batches/${batchId}/enrollments`] });
        },
    });
}

// --- New additions for batch list ---

export type Instructor = {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
};

export function useInstructors() {
    return useQuery<Instructor[]>({
        queryKey: ["/auth/admin/users?role=instructor"],
        queryFn: async () => {
            // Re-using the admin users endpoint with role filtering if supported, 
            // or fetching all and filtering client side if the API text search usage implies limited filtering.
            // For now, let's assume we can fetch all or a large list and filter for instructors.
            // Note: The monolith might have a specific /instructors endpoint or similar. 
            // Based on available endpoints, /auth/admin/users seems best.
            const response = await apiRequest<{ users: any[] }>("/auth/admin/users?limit=1000");

            // Filter for instructors
            return response.users
                .filter((u: any) => u.roles && u.roles.includes('instructor'))
                .map((u: any) => ({
                    id: u.id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email
                }));
        },
    });
}

export function useEligibleStudents(batchId: number, searchQuery: string) {
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

    // Debounce search query (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return useQuery<EligibleStudent[]>({
        queryKey: [`/batches/${batchId}/eligible-students`, debouncedSearch],
        queryFn: async () => {
            const url = debouncedSearch
                ? `/batches/${batchId}/eligible-students?search=${encodeURIComponent(debouncedSearch)}`
                : `/batches/${batchId}/eligible-students`;
            const res = await apiRequest<any>(url);
            if (Array.isArray(res)) return res;
            if (res.data && Array.isArray(res.data)) return res.data;
            if (res.items && Array.isArray(res.items)) return res.items;
            return [];
        },
        enabled: true,
    });
}
