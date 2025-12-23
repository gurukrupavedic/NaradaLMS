import React from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { useBatchDetail } from "../hooks/useBatchDetail";
import { useBatchProgress } from "../hooks/useBatchProgress";
import { useEvaluateStudent } from "../hooks/useEvaluateStudent";

export default function BatchDetail() {
  const [, params] = useRoute("/app/batches/:id");
  const batchId = params?.id;
  const { data: batch, isLoading: loadingBatch } = useBatchDetail(batchId);
  const { data: progress, isLoading: loadingProgress } = useBatchProgress(batchId);
  const evaluate = useEvaluateStudent();

  if (loadingBatch || loadingProgress) {
    return <div className="p-4 text-sm text-muted-foreground">Loading batch…</div>;
  }

  if (!batch) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Batch not found.</p>
        <Link href="/app/batches">
          <a className="text-sm text-primary">Back to My Batches</a>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Instructor</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">{batch.batchName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Code: {batch.batchCode} • Status: {batch.status}</p>
        </div>
        <Link href="/app/batches">
          <a className="text-sm text-primary hover:opacity-80 transition-colors">Back to My Batches</a>
        </Link>
      </div>

      {/* Simple progress preview; full table/cards in follow-up step */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Student Progress</p>
        {!progress || progress.rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No progress data available.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="p-2">Student</th>
                  {progress.chapters.map((c) => (
                    <th key={c.chapterId} className="p-2 whitespace-nowrap">{c.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {progress.rows.map((row) => (
                  <tr key={row.studentId} className="border-t border-border">
                    <td className="p-2 whitespace-nowrap">{row.studentName ?? row.studentId}</td>
                    {progress.chapters.map((c) => {
                      const cell = row.cells.find((x) => x.chapterId === c.chapterId);
                      const level = cell?.proficiencyLevel ?? 0;
                      const saving = evaluate.isPending;
                      return (
                        <td key={c.chapterId} className="p-2">
                          <label className="sr-only" htmlFor={`lvl-${row.studentId}-${c.chapterId}`}>Proficiency</label>
                          <select
                            id={`lvl-${row.studentId}-${c.chapterId}`}
                            className="h-8 rounded-md border border-border bg-background px-2 text-foreground"
                            value={level}
                            disabled={saving}
                            onChange={(e) => {
                              const newLevel = parseInt(e.target.value, 10);
                              evaluate.mutate({
                                batchId: batchId!,
                                studentId: row.studentId,
                                chapterId: c.chapterId,
                                proficiencyLevel: newLevel,
                              });
                            }}
                          >
                            {[0,1,2,3,4].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
