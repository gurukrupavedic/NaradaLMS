import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { BatchDetail } from "./useBatches";

export function useBatch(batchId?: number) {
  return useQuery<BatchDetail | null>({
    queryKey: batchId ? ["/api/batches", batchId] : ["/api/batches", "none"],
    queryFn: async () => {
      if (!batchId) return null;
      const res = await apiRequest("GET", `/api/batches/${batchId}`);
      if (!res.ok) throw new Error(`Failed to load batch ${batchId}`);
      return res.json();
    },
    enabled: Boolean(batchId),
  });
}
