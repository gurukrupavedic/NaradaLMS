import React from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { useBatchDetail } from "../hooks/useBatchDetail";
import { useBatchProgress } from "../hooks/useBatchProgress";

export default function BatchDetail() {
  const [, params] = useRoute("/app/batches/:id");
  const batchId = params?.id;
  const { data: batch, isLoading: loadingBatch } = useBatchDetail(batchId);
  const { data: progress, isLoading: loadingProgress } = useBatchProgress(batchId);

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
                      return (
                        <td key={c.chapterId} className="p-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs">
                            {level}
                          </span>
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
