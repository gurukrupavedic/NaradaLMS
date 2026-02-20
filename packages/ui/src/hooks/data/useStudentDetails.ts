"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@narada/api-client";
import type { StudentDetail } from "@narada/types";

export type StudentDetails = StudentDetail;

export function useStudentDetails(studentId: string) {
  return useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      return apiRequest<StudentDetail>(`/students/${studentId}/progress`);
    },
    enabled: !!studentId,
  });
}
