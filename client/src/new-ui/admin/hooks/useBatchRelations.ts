import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type CoInstructor = {
  id: number;
  batchId: number;
  instructorId: string;
  role: string;
  assignedAt?: string;
  assignedBy?: string;
};

export type Enrollment = {
  id: number;
  batchId: number;
  studentId: string;
  status: string; // active, dropped, completed
  enrolledAt?: string;
  droppedAt?: string | null;
};

export function useCoInstructors(batchId: number) {
  return useQuery<CoInstructor[]>({
    queryKey: [`/api/batches/${batchId}/co-instructors`],
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
