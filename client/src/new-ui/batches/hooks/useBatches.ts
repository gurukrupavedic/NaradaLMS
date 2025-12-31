import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface BatchItem {
  id: number;
  batchCode: string;
  batchName: string;
  trackId?: number | null;
  primaryInstructorId?: string | null;
  studentCount?: number;
  status: string;
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: { limit: number; offset: number; total: number };
}

export function useBatches(params?: { limit?: number; offset?: number }) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  return useQuery<PaginatedResponse<BatchItem>>({
    queryKey: [`/api/batches/my-batches?limit=${limit}&offset=${offset}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });
}
