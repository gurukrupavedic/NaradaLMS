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

export type BatchPaginationParams = {
  limit?: number;
  offset?: number;
};

export function useBatches(params?: BatchPaginationParams) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  return useQuery<{ items: Batch[]; pagination: { limit: number; offset: number; total: number } }>({
    queryKey: ["/api/batches", limit, offset],
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
      qc.invalidateQueries({ queryKey: [/\/api\/batches/] });
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
      qc.invalidateQueries({ queryKey: [/\/api\/batches/] });
    },
  });
}
