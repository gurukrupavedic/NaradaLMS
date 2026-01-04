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
    <div className="space-y-6 px-4 pt-4 pb-8">
      {/* Loading State */}
      {isLoadingState && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-6 space-y-3">
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
        </div>
      )}

      {/* Error State */}
      {!isLoadingState && error && (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-border/30 bg-card">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load batches</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "An error occurred while loading your batches"}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingState && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-border/30 bg-card">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No batches assigned</h3>
          <p className="text-sm text-muted-foreground">
            You don't have any batches assigned yet. Contact your administrator.
          </p>
        </div>
      )}

      {/* Batch Cards */}
      {!isLoadingState && !error && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((b) => (
            <Link key={b.id} href={`/app/instructor/batches/${b.id}`}>
              <a className="group block rounded-lg border border-border bg-card transition duration-200 hover:shadow-md hover:border-border/80">
                {/* Batch Name - Header with full-width divider */}
                <div className="p-5 pb-3 border-b border-border/50 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-foreground">
                    {b.batchCode} - {b.batchName}
                  </h3>
                  {b.trackName && (
                    <p className="text-sm text-muted-foreground">
                      {b.trackName}
                    </p>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-3 gap-4 p-5 text-xs">
                  {/* Column 1 */}
                  <div className="space-y-3">
                    {/* Primary Instructor */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Primary Instructor</p>
                      <p className="text-sm font-medium text-foreground mt-1">
                        {b.primaryInstructorName || "—"}
                      </p>
                    </div>

                    {/* Created */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Created</p>
                      <p className="text-sm text-foreground mt-1">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-3">
                    {/* Co-Instructors */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Co-Instructors</p>
                      <p className="text-sm text-foreground mt-1">
                        {b.coInstructorNames || "—"}
                      </p>
                    </div>

                    {/* Updated */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Updated</p>
                      <p className="text-sm text-foreground mt-1">
                        {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Column 3 */}
                  <div className="space-y-3">
                    {/* Cohort Type */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Cohort Type</p>
                      <p className="text-sm font-medium text-foreground mt-1">
                        {b.cohortType === "bramhachari" ? "Brahmacharya" : b.cohortType === "grihasta" ? "Grihasta" : "—"}
                      </p>
                    </div>

                    {/* Active Enrollment */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Active Enrollment</p>
                      <p className="text-sm font-medium text-foreground mt-1">
                        {b.studentCount} {b.studentCount === 1 ? "Student" : "Students"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* View Details */}
                <div className="flex justify-end p-5 pt-0">
                  <div className="inline-flex items-center gap-2 text-sm text-primary font-medium group-hover:gap-3 transition-all">
                    <span>View Details</span>
                    <span className="transition-transform duration-150 group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </a>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
