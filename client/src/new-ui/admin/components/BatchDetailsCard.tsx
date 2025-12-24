import React from "react";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { BatchDetail } from "../hooks/useBatches";

interface Batch {
  id: number;
  batchCode: string;
  batchName: string;
  trackId?: number | null;
  primaryInstructorId?: string | null;
  cohortType?: string | null;
  description?: string | null;
  studentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface BatchDetailsCardProps {
  batch: BatchDetail;
  batches: Batch[];
  batchesLoading?: boolean;
  onBatchChange: (id: number) => void;
}

export function BatchDetailsCard({ batch, batches, batchesLoading, onBatchChange }: BatchDetailsCardProps) {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = Number(e.target.value);
    if (nextId) onBatchChange(nextId);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatInstructorName = (firstName?: string | null, lastName?: string | null) => {
    if (firstName || lastName) return `${firstName ?? ""} ${lastName ?? ""}`.trim();
    return "—";
  };

  const coInstructorsList = batch.coInstructors?.length
    ? batch.coInstructors.map((ci) => formatInstructorName(ci.firstName, ci.lastName)).join(", ")
    : "—";

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      {/* 3-column layout matching the reference */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Column 1: Batch selector, Cohort Type, Active Enrollment */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Batch</div>
            {batchesLoading ? (
              <Skeleton className="h-9 w-64" />
            ) : batches.length > 0 ? (
              <div className="relative inline-flex items-center">
                <select
                  value={batch.id}
                  onChange={handleSelectChange}
                  title="Select a batch"
                  className="appearance-none bg-transparent pr-6 text-base font-medium text-foreground cursor-pointer focus:outline-none focus:ring-0 border-0"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchCode} - {b.batchName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
              </div>
            ) : (
              <span className="text-base text-muted-foreground">No batches</span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Cohort Type</div>
            <div className="text-base font-medium text-foreground">{batch.cohortType || "—"}</div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Active Enrollment</div>
            <div className="text-base font-medium text-foreground">{batch.studentCount || 0}</div>
          </div>
        </div>

        {/* Column 2: Batch display, Primary Instructor */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Batch</div>
            <div className="text-base font-medium text-foreground">
              {batch.batchCode} - {batch.batchName}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Primary Instructor</div>
            <div className="text-base font-medium text-foreground">
              {batch.primaryInstructor
                ? formatInstructorName(batch.primaryInstructor.firstName, batch.primaryInstructor.lastName)
                : "—"}
            </div>
          </div>
        </div>

        {/* Column 3: Track, Co-Instructors */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Track</div>
            <div className="text-base font-medium text-foreground">{batch.track?.title || batch.track?.name || "—"}</div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Co-Instructors</div>
            <div className="text-base font-medium text-foreground">{coInstructorsList}</div>
          </div>
        </div>
      </div>

      {/* Description section (full width) */}
      <div className="border-t border-border pt-6 space-y-1.5">
        <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Description</div>
        <div className="text-base text-foreground">{batch.description || "—"}</div>
      </div>

      {/* Timestamps */}
      <div className="border-t border-border pt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Created</div>
          <div className="text-base font-medium text-foreground">{formatDate(batch.createdAt)}</div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Updated</div>
          <div className="text-base font-medium text-foreground">{formatDate(batch.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
}
