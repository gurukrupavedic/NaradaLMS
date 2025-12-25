import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type Batch = {
  id: number;
  batchCode: string;
  batchName: string;
  trackId?: number | null;
  primaryInstructorId?: string | null;
  cohortType?: string | null;
  description?: string | null;
  studentCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BatchDetail = Batch & {
  track?: { id: number; title?: string | null; name?: string | null } | null;
  primaryInstructor?: { id: string; firstName?: string | null; lastName?: string | null; email: string } | null;
  coInstructors?: { id: number; instructorId: string; role: string; firstName?: string | null; lastName?: string | null; email?: string | null }[];
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
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/batches?limit=${limit}&offset=${offset}`);
      return await res.json();
    },
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    // Allow extra fields like secondaryInstructorIds in create payload
    mutationFn: async (payload: Partial<Batch> & { secondaryInstructorIds?: string[]; [key: string]: any }) => {
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
    // Be flexible with payload keys for partial updates
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<Batch> & { [key: string]: any } }) => {
      const res = await apiRequest("PATCH", `/api/batches/${id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [/\/api\/batches/] });
    },
  });
}
