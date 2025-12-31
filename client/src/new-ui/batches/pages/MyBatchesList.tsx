import React from "react";
import { Link } from "wouter";
import { useBatches } from "../hooks/useBatches";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, AlertCircle } from "lucide-react";

export default function MyBatchesList() {
  const { data, isLoading, error, refetch, isRefetching } = useBatches();

  const items = data?.items ?? [];
  const isLoadingState = isLoading || isRefetching;

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoadingState && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16 mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoadingState && error && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <p className="font-medium">Failed to load batches</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingState && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="rounded-full bg-muted p-3">
            <GraduationCap className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <p className="font-medium">No batches assigned</p>
            <p className="text-sm text-muted-foreground">
              You don't have any batches assigned yet. Contact your administrator.
            </p>
          </div>
        </div>
      )}

      {/* Batch Cards */}
      {!isLoadingState && !error && items.length > 0 && (
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
        </div>
      )}
    </div>
  );
}
