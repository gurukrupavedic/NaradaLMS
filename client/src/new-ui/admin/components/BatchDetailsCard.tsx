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

  const formatCohortType = (value?: string | null) => {
    if (!value) return "—";
    const lower = value.toLowerCase();
    if (lower === "grihasta") return "Grihasta";
    if (lower === "bramhachari") return "Bramhachari";
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const formatStudents = (count?: number | null) => {
    const n = typeof count === "number" ? count : 0;
    return `${n} ${n === 1 ? "Student" : "Students"}`;
  };

  const coInstructorsList = batch.coInstructors?.length
    ? batch.coInstructors.map((ci) => formatInstructorName(ci.firstName, ci.lastName)).join(", ")
    : "—";

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      {/* Grid ordered as requested */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Row 1: Batch, Current Track, Cohort Type */}
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
                  className="appearance-none bg-transparent pr-6 text-base font-medium text-foreground cursor-pointer focus:outline-none focus:ring-0 border-0 dark:[&>option]:bg-black dark:[&>option]:text-white [&>option]:bg-white [&>option]:text-black"
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
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Current Track</div>
            <div className="text-base font-medium text-foreground">{batch.track?.title || batch.track?.name || "—"}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Cohort Type</div>
            <div className="text-base font-medium text-foreground">{formatCohortType(batch.cohortType)}</div>
          </div>
        </div>

        {/* Row 2: Primary Instructor, Co-Instructors, Active Enrollment */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Primary Instructor</div>
            <div className="text-base font-medium text-foreground">
              {batch.primaryInstructor
                ? formatInstructorName(batch.primaryInstructor.firstName, batch.primaryInstructor.lastName)
                : "—"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Co-Instructors</div>
            <div className="text-base font-medium text-foreground">{coInstructorsList}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Active Enrollment</div>
            <div className="text-base font-medium text-foreground">{formatStudents(batch.studentCount)}</div>
          </div>
        </div>

        {/* Row 3: Created, Updated */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Created</div>
            <div className="text-base font-medium text-foreground">{formatDate(batch.createdAt)}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Updated</div>
            <div className="text-base font-medium text-foreground">{formatDate(batch.updatedAt)}</div>
          </div>
        </div>
      </div>

      {/* Description at end with single divider */}
      <div className="border-t border-border pt-6 space-y-1.5">
        <div className="text-[10px] font-normal uppercase text-muted-foreground/50">Description</div>
        <div className="text-base text-foreground">{batch.description || "—"}</div>
      </div>
    </div>
  );
}

