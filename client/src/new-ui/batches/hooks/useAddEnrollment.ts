import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AddEnrollmentPayload {
  batchId: number | string;
  studentId: string;
}

export function useAddEnrollment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddEnrollmentPayload) => {
      const { batchId, studentId } = payload;
      const res = await apiRequest(
        'POST',
        `/api/batches/${batchId}/enrollments`,
        { studentId, enrolledBy: 'system' }
      );
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [`/api/batches/${variables.batchId}/enrollments`] });
    },
  });
}
