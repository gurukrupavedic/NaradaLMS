import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface ChapterProgressCell {
  chapterId: number;
  proficiencyLevel: number; // 0-4
  lastEvaluatedAt?: string | null;
  evaluatedBy?: string | null;
  notes?: string | null;
}

export interface StudentProgressRow {
  studentId: string;
  studentName?: string | null;
  cells: ChapterProgressCell[];
}

export interface BatchProgressResponseUI {
  batchId: number;
  rows: StudentProgressRow[];
  chapters: { chapterId: number; title: string }[];
}

// Raw server response shape
interface BatchProgressResponseServer {
  batchId: number;
  batchName: string;
  trackId?: number | null;
  trackName?: string | null;
  students: Array<{
    studentId: string;
    studentName?: string | null;
    email?: string | null;
    chapters: Array<{
      chapterId: number;
      chapterTitle: string;
      chapterNumber: number;
      proficiencyLevel: number | null;
      lastAccessed?: string | null;
      lastEvaluatedAt?: string | null;
      evaluatedBy?: string | null;
      notes?: string | null;
    }>;
  }>;
}

function transform(server: BatchProgressResponseServer): BatchProgressResponseUI {
  const chapterIndex = new Map<number, { chapterId: number; title: string }>();
  // derive chapters list from first student or by scanning all students
  for (const s of server.students) {
    for (const ch of s.chapters) {
      if (!chapterIndex.has(ch.chapterId)) {
        chapterIndex.set(ch.chapterId, { chapterId: ch.chapterId, title: ch.chapterTitle });
      }
    }
  }
  const chapters = Array.from(chapterIndex.values()).sort((a, b) => a.chapterId - b.chapterId);

  const rows: StudentProgressRow[] = server.students.map((s) => ({
    studentId: s.studentId,
    studentName: s.studentName ?? s.email ?? null,
    cells: chapters.map((c) => {
      const found = s.chapters.find((x) => x.chapterId === c.chapterId);
      return {
        chapterId: c.chapterId,
        proficiencyLevel: found?.proficiencyLevel ?? 0,
        lastEvaluatedAt: found?.lastEvaluatedAt ?? null,
        evaluatedBy: found?.evaluatedBy ?? null,
        notes: found?.notes ?? null,
      };
    }),
  }));

  return { batchId: server.batchId, rows, chapters };
}

export function useBatchProgress(batchId: number | string | undefined) {
  return useQuery<BatchProgressResponseUI>({
    queryKey: batchId ? [`/api/batches/${batchId}/progress`] : ["/api/batches/undefined/progress"],
    queryFn: async ({ queryKey }) => {
      const res = await getQueryFn<BatchProgressResponseServer>({ on401: "throw" })({ queryKey } as any);
      return transform(res as unknown as BatchProgressResponseServer);
    },
    enabled: Boolean(batchId),
  });
}
