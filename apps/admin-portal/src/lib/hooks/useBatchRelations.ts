'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import {
  useCoInstructors,
  useInstructors,
  useEnrollments,
  useEligibleStudents,
  useDropEnrollment,
  type CoInstructor,
  type Enrollment,
  type Instructor,
} from '@narada/ui';
import type { EligibleStudent } from '@narada/ui';

export {
  useCoInstructors,
  useInstructors,
  useEnrollments,
  useEligibleStudents,
  useDropEnrollment,
  type CoInstructor,
  type Enrollment,
  type Instructor,
  type EligibleStudent,
};

export function useAssignCoInstructor(batchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instructorId,
      role,
    }: {
      instructorId: string;
      role?: string;
    }) => {
      return apiRequest(`/batches/${batchId}/co-instructors`, {
        method: 'POST',
        body: JSON.stringify({ instructorId, role }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [`/batches/${batchId}/co-instructors`],
      });
    },
  });
}

export function useRemoveCoInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      batchId,
    }: {
      assignmentId: number;
      batchId: number;
    }) => {
      await apiRequest(`/co-instructors/${assignmentId}`, {
        method: 'DELETE',
      });
      return { batchId };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: [`/batches/${variables.batchId}/co-instructors`],
      });
    },
  });
}

export function useEnrollStudent(batchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      return apiRequest(`/batches/${batchId}/enrollments`, {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [`/batches/${batchId}/enrollments`],
      });
    },
  });
}
