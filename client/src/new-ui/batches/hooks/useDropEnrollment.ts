import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface DropEnrollmentPayload {
  enrollmentId: number;
  batchId: number | string;
  droppedReason?: string;
}

export function useDropEnrollment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DropEnrollmentPayload) => {
      const { enrollmentId, droppedReason } = payload;
      const res = await apiRequest(
        'PATCH',
        `/api/enrollments/${enrollmentId}/drop`,
        { droppedReason }
      );
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [`/api/batches/${variables.batchId}/enrollments`] });
    },
  });
}
