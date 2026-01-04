/* eslint-disable jsx-a11y/aria-proptypes */
import React from "react";
import { ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BatchDetail } from "../hooks/useBatches";

interface BatchDetailsCardProps {
  batch: BatchDetail;
  batches?: Array<{ id: number; batchCode: string; batchName: string }>;
  currentBatchId?: number;
  onBatchChange?: (batchId: number) => void;
}

export function BatchDetailsCard({ batch, batches = [], currentBatchId, onBatchChange }: BatchDetailsCardProps) {
  const [collapsed, setCollapsed] = React.useState(false);

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

  const formatTrack = () => {
    if (!batch.track) return "—";
    const trackName = batch.track.title || batch.track.name || "Untitled Track";
    const trackOrder = batch.track.order;
    return trackOrder ? `Track ${trackOrder} - ${trackName}` : trackName;
  };

  const coInstructorsList = batch.coInstructors?.length
    ? batch.coInstructors.map((ci) => formatInstructorName(ci.firstName, ci.lastName)).join(", ")
    : "—";

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
            <span className="truncate">{formatTrack()}</span>
            <span className="opacity-60 flex-shrink-0">•</span>
            <span>{formatCohortType(batch.cohortType)}</span>
            <span className="opacity-60 flex-shrink-0">•</span>
            <span className="truncate">
              {batch.primaryInstructor
                ? formatInstructorName(batch.primaryInstructor.firstName, batch.primaryInstructor.lastName)
                : "—"}
            </span>
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
            {/* Batch Selector Dropdown */}
            {batches.length > 0 && currentBatchId && onBatchChange && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-tight block mb-2">
                  Select Batch
                </label>
                <Select
                  value={String(currentBatchId)}
                  onValueChange={(value) => onBatchChange(Number(value))}
                >
                  <SelectTrigger className="h-9 text-sm border-border data-[state=open]:bg-muted">
                    <SelectValue placeholder="Select batch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.batchCode} - {b.batchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                  {formatTrack()}
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

              {/* Primary Instructor */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                  Primary Instructor
                </p>
                <p className="text-sm text-foreground mt-1">
                  {batch.primaryInstructor
                    ? formatInstructorName(batch.primaryInstructor.firstName, batch.primaryInstructor.lastName)
                    : "—"}
                </p>
              </div>

              {/* Co-Instructors */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                  Co-Instructors
                </p>
                <p className="text-sm text-foreground mt-1">
                  {coInstructorsList}
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

              {/* Created */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                  Created
                </p>
                <p className="text-sm text-foreground mt-1">
                  {formatDate(batch.createdAt)}
                </p>
              </div>

              {/* Updated */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                  Updated
                </p>
                <p className="text-sm text-foreground mt-1">
                  {formatDate(batch.updatedAt)}
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

