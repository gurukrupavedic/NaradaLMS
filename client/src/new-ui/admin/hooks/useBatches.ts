import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type Batch = {
  id: number;
  batchCode: string;
  batchName: string;
  trackId?: number | null;
  primaryInstructorId?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export function useBatches() {
  return useQuery<Batch[]>({
    queryKey: ["/api/batches"],
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Batch>) => {
      const res = await apiRequest("POST", "/api/batches", payload);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/batches"] });
    },
  });
}

export function useUpdateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<Batch> }) => {
      const res = await apiRequest("PATCH", `/api/batches/${id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/batches"] });
    },
  });
}
