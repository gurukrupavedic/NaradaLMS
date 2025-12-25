import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
    queryKey: [`/api/batches/${batchId}/co-instructors`],
    enabled: options?.enabled ?? true,
  });
}

export function useAssignCoInstructor(batchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ instructorId, role }: { instructorId: string; role?: string }) => {
      const res = await apiRequest("POST", `/api/batches/${batchId}/co-instructors`, { instructorId, role });
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/batches/${batchId}/co-instructors`] });
    },
  });
}

export function useRemoveCoInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, batchId }: { assignmentId: number; batchId: number }) => {
      const res = await apiRequest("DELETE", `/api/co-instructors/${assignmentId}`);
      await res.json();
      return { batchId };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [`/api/batches/${variables.batchId}/co-instructors`] });
    },
  });
}

export function useEnrollments(batchId: number) {
  return useQuery<Enrollment[]>({
    queryKey: [`/api/batches/${batchId}/enrollments`],
  });
}

export function useEnrollStudent(batchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      const res = await apiRequest("POST", `/api/batches/${batchId}/enrollments`, { studentId });
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/batches/${batchId}/enrollments`] });
    },
  });
}

export function useDropEnrollment(batchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollmentId }: { enrollmentId: number }) => {
      const res = await apiRequest("PATCH", `/api/enrollments/${enrollmentId}/drop`);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/batches/${batchId}/enrollments`] });
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
    queryKey: [`/api/batches/${batchId}/eligible-students`, debouncedSearch],
    queryFn: async () => {
      const url = debouncedSearch
        ? `/api/batches/${batchId}/eligible-students?search=${encodeURIComponent(debouncedSearch)}`
        : `/api/batches/${batchId}/eligible-students`;
      const res = await apiRequest("GET", url);
      return await res.json();
    },
    enabled: searchQuery.trim().length > 0, // Only fetch when there's a search query
  });
}
