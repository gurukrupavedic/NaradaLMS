import React from "react";
import { ChevronDown, ArrowLeftRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
      {/* Collapsible Header */}
      <div
        className="flex items-center gap-2.5 mb-2 cursor-pointer hover:bg-muted/30 -mx-4 px-4 py-0.5 rounded-t-lg transition-colors"
        onClick={() => setCollapsed((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setCollapsed((v) => !v);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand batch details" : "Collapse batch details"}
      >
        {/* Header Content - Always visible summary, conditional expanded details */}
        {collapsed ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-foreground flex-1 min-w-0">
            <span className="font-mono font-semibold flex-shrink-0">{batch.batchCode}</span>
            <span className="opacity-60 flex-shrink-0">-</span>
            <span className="font-medium truncate">{batch.batchName}</span>
            <span className="opacity-60 flex-shrink-0">•</span>
            <span className="truncate">{batch.trackName || "—"}</span>
            <span className="opacity-60 flex-shrink-0">•</span>
            <span>{formatCohortType(batch.cohortType)}</span>
            <span className="opacity-60 flex-shrink-0">•</span>
            <span className="flex-shrink-0">{formatStudents(batch.studentCount)}</span>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base leading-none">{batch.batchCode} - {batch.batchName}</h3>
            </div>
          </div>
        )}

        {/* Batch Selector Button - shows only when expanded */}
        {!collapsed && batches.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="p-0.5 text-foreground/60 hover:text-foreground hover:bg-muted/30 rounded-md transition-colors flex-shrink-0"
                title="Switch batch"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-black border border-border shadow-lg min-w-56">
              {batches.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => onBatchChange(b.id)}
                  className={`py-1.5 cursor-pointer ${
                    b.id === batch.id
                      ? "bg-muted/50 text-foreground font-medium"
                      : ""
                  }`}
                >
                  <span className="font-mono text-sm text-muted-foreground">{b.batchCode}</span>
                  <span className="text-sm text-foreground ml-2">-</span>
                  <span className="text-sm text-foreground ml-2">{b.batchName}</span>
                </DropdownMenuItem>
              ))}}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Expand/Collapse Icon - purely decorative, parent handles interaction */}
        <div className="p-0.5 text-foreground/60 pointer-events-none flex-shrink-0">
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Divider */}
          <div className="border-t -mx-4 px-4 pt-4 mt-1">
            {/* Batch Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {/* Batch Code */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                  Code
                </p>
                <p className="text-sm font-mono text-foreground mt-1">
                  {batch.batchCode}
                </p>
              </div>

              {/* Batch Name */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                  Batch Name
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {batch.batchName}
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

            {/* Description - Full width, appears below grid */}
            {batch.description && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-tight block mb-2">
                  Description
                </label>
                <p className="text-sm text-foreground">
                  {batch.description}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
