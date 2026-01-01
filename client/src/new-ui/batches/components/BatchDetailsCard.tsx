import React from "react";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { BatchItem } from "../hooks/useBatches";

interface BatchDetailsCardProps {
  batch: BatchItem;
  batches: BatchItem[];
  batchesLoading?: boolean;
  onBatchChange: (id: number) => void;
}

export function BatchDetailsCard({
  batch,
  batches,
  batchesLoading,
  onBatchChange,
}: BatchDetailsCardProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = Number(e.target.value);
    if (nextId) onBatchChange(nextId);
  };

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCohortType = (value?: string | null) => {
    if (!value) return "—";
    const lower = value.toLowerCase();
    if (lower === "grihasta") return "Grihasta";
    if (lower === "bramhachari") return "Brahmacharya";
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const formatStudents = (count?: number | null) => {
    const n = typeof count === "number" ? count : 0;
    return `${n} ${n === 1 ? "Student" : "Students"}`;
  };

  if (batchesLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 relative">
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between mb-3">
        {collapsed ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground pr-10">
            <span className="font-medium">
              {batch.batchCode} - {batch.batchName}
            </span>
            <span className="opacity-60">•</span>
            <span>{batch.trackName || "—"}</span>
            <span className="opacity-60">•</span>
            <span>{formatCohortType(batch.cohortType)}</span>
            <span className="opacity-60">•</span>
            <span>{formatStudents(batch.studentCount)}</span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute top-4 right-4 p-1 rounded-md text-foreground/60 hover:bg-muted hover:text-foreground transition-all"
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? "Expand batch details" : "Collapse batch details"
          }
        >
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Batch Selector Dropdown */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-tight block mb-2">
              Select Batch
            </label>
            <select
              value={batch.id}
              onChange={handleSelectChange}
              className="w-full h-9 px-3 py-1 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchCode} - {b.batchName}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {/* Batch Name */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                Batch Name
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                {batch.batchName}
              </p>
            </div>

            {/* Batch Code */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                Code
              </p>
              <p className="text-sm font-mono text-foreground mt-1">
                {batch.batchCode}
              </p>
            </div>

            {/* Current Track */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                Current Track
              </p>
              <p className="text-sm text-foreground mt-1">
                {batch.trackName || "—"}
              </p>
            </div>

            {/* Cohort Type */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                Cohort Type
              </p>
              <p className="text-sm text-foreground mt-1">
                {formatCohortType(batch.cohortType)}
              </p>
            </div>

            {/* Active Enrollment */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                Active Enrollment
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                {formatStudents(batch.studentCount)}
              </p>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                Status
              </p>
              <p className="text-sm capitalize text-foreground mt-1">
                {batch.status}
              </p>
            </div>

            {/* Primary Instructor */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                Primary Instructor
              </p>
              <p className="text-sm text-foreground mt-1">
                {batch.primaryInstructorName || "—"}
              </p>
            </div>

            {/* Co-Instructors */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                Co-Instructors
              </p>
              <p className="text-sm text-foreground mt-1">
                {batch.coInstructorNames || "—"}
              </p>
            </div>

            {/* Created */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                Created
              </p>
              <p className="text-sm text-foreground mt-1">
                {formatDate(batch.createdAt)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
