import React from "react";
import { Link } from "wouter";
import { useBatches } from "../hooks/useBatches";

export default function MyBatchesList() {
  const { data, isLoading, error } = useBatches();

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading batches…</div>;
  if (error) return <div className="p-4 text-sm text-destructive">Failed to load batches.</div>;

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((b) => (
          <Link key={b.id} href={`/app/batches/${b.id}`}>
            <a className="group block overflow-hidden rounded-2xl border border-border bg-card p-5 transition duration-200 hover:bg-muted">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-foreground">{b.batchName}</div>
                <div className="flex items-center gap-2">
                  {b.cohortType && (
                    <span className="text-[11px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                      {b.cohortType === "bramhachari" ? "Bramhachari" : "Grihasta"}
                    </span>
                  )}
                  <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">{b.status}</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Code: {b.batchCode}</p>
              {b.trackId ? (
                <p className="mt-1 text-xs text-muted-foreground">Track: #{b.trackId}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">No track assigned</p>
              )}
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
                <span>Open</span>
                <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
              </div>
            </a>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">No batches available.</div>
        )}
      </div>
    </div>
  );
}
