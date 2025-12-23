import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface EnrollmentItem {
  id: number;
  batchId: number;
  studentId: string;
  status: string; // 'active', 'dropped'
  enrolledAt: string;
  enrolledBy: string;
  droppedAt?: string | null;
  droppedReason?: string | null;
  updatedAt: string;
}

export function useEnrollments(batchId: number | string | undefined) {
  return useQuery<EnrollmentItem[]>({
    queryKey: batchId ? [`/api/batches/${batchId}/enrollments`] : ["/api/batches/undefined/enrollments"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: Boolean(batchId),
  });
}
