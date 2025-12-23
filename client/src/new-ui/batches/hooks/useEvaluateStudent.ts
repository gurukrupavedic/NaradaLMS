import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/features/shared-features/hooks/use-toast";

interface EvaluatePayload {
  batchId: number | string;
  studentId: string;
  chapterId: number;
  proficiencyLevel: number; // 0-4
  notes?: string;
}

export function useEvaluateStudent() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: EvaluatePayload) => {
      const { batchId, studentId, chapterId, proficiencyLevel, notes } = payload;
      const res = await apiRequest(
        'POST',
        `/api/batches/${batchId}/students/${studentId}/evaluate`,
        { chapterId, proficiencyLevel, notes }
      );
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [`/api/batches/${variables.batchId}/progress`] });
      toast({ title: "Proficiency updated", description: `Level set to ${variables.proficiencyLevel}` });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update proficiency", description: err.message, variant: "destructive" });
    },
  });
}
