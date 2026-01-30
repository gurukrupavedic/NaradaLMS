import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface BatchDetail {
  id: number;
  batchCode: string;
  batchName: string;
  trackId?: number | null;
  primaryInstructorId?: string | null;
  status: string;
}

export function useBatchDetail(batchId: number | string | undefined) {
  return useQuery<BatchDetail>({
    queryKey: batchId ? [`/api/batches/${batchId}`] : ["/api/batches/undefined"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: Boolean(batchId),
  });
}
