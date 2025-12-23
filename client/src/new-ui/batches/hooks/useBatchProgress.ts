import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface ChapterProgressCell {
  chapterId: number;
  proficiencyLevel: number; // 0-4
  lastEvaluatedAt?: string | null;
  notes?: string | null;
}

export interface StudentProgressRow {
  studentId: string;
  studentName?: string;
  cells: ChapterProgressCell[];
}

export interface BatchProgressResponse {
  batchId: number;
  rows: StudentProgressRow[];
  chapters: { chapterId: number; title: string }[];
}

export function useBatchProgress(batchId: number | string | undefined) {
  return useQuery<BatchProgressResponse>({
    queryKey: batchId ? [`/api/batches/${batchId}/progress`] : ["/api/batches/undefined/progress"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: Boolean(batchId),
  });
}
