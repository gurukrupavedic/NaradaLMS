import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/features/shared-features/hooks/use-toast";

interface DropEnrollmentPayload {
  enrollmentId: number;
  batchId: number | string;
  droppedReason?: string;
}

export function useDropEnrollment() {
  const qc = useQueryClient();
  const { toast } = useToast();

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
      toast({ title: "Student dropped", description: "Enrollment status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to drop student", description: err.message, variant: "destructive" });
    },
  });
}
