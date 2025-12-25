import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { useEnrollments, useDropEnrollment, useEligibleStudents, useEnrollStudent, type EligibleStudent } from "../hooks/useBatchRelations";
import { useBatches } from "../hooks/useBatches";
import { useToast } from "@/features/shared-features/hooks/use-toast";
import { BatchDetailsCard } from "../components/BatchDetailsCard";
import { useBatch } from "../hooks/useBatch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

type Enrollment = {
  id: number;
  studentId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status: string;
};

export default function BatchDetailAdmin() {
  const { toast } = useToast();
  const [, params] = useRoute("/app/admin/batches/:id");
  const [, setLocation] = useLocation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Enrollment typeahead state
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: batchesData, isLoading: isBatchesLoading } = useBatches({ limit: 500, offset: 0 });
  const batches = batchesData?.items ?? [];
  const batchId = Number(params?.id);

  const batchDetail = useBatch(isNaN(batchId) ? undefined : batchId);
  const enrollments = useEnrollments(batchId);
  const dropEnrollment = useDropEnrollment(batchId);
  const enrollStudent = useEnrollStudent(batchId);
  const eligibleStudents = useEligibleStudents(batchId, searchQuery);

  // If the route param is invalid (e.g., /i), redirect to first batch when available
  useEffect(() => {
    if (Number.isNaN(batchId) && batches.length > 0) {
      setLocation(`/app/admin/batches/${batches[0].id}`);
    }
  }, [batchId, batches, setLocation]);

  // Reset pagination when batch changes
  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: 10 });
    setSearchQuery("");
    setShowDropdown(false);
  }, [batchId]);

  // Handle dropdown visibility
  useEffect(() => {
    setShowDropdown(searchQuery.trim().length > 0 && eligibleStudents.data !== undefined);
  }, [searchQuery, eligibleStudents.data]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [eligibleStudents.data]);

  // Handle enrollment
  const handleEnroll = (student: EligibleStudent) => {
    const displayName = student.firstName || student.lastName
      ? `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim()
      : student.email;

    enrollStudent.mutate(
      { studentId: student.id },
      {
        onSuccess: () => {
          toast({ title: "Student enrolled successfully" });
          setSearchQuery("");
          setShowDropdown(false);
        },
        onError: (err: any) => {
          // ONE-TO-MANY CONSTRAINT: Handle already-enrolled error
          const isAlreadyEnrolled = err.message?.includes('already enrolled') || 
                                   (err.code === 'ALREADY_ENROLLED');
          
          const errorMessage = isAlreadyEnrolled
            ? `${displayName} is already enrolled in another batch. Students can only enroll in one batch at a time.`
            : err.message || "Failed to enroll student";

          toast({
            title: isAlreadyEnrolled ? "Already Enrolled" : "Failed to enroll student",
            description: errorMessage,
            variant: "destructive",
          });
        },
      }
    );
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const students = eligibleStudents.data ?? [];
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, students.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && students.length > 0 && highlightedIndex >= 0) {
      e.preventDefault();
      handleEnroll(students[highlightedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchQuery("");
      setShowDropdown(false);
    }
  };

  // Define columns for enrollment table
  const enrollmentData = enrollments.data ?? [];
  const enrollmentCount = enrollmentData.length;

  const columns = useMemo<ColumnDef<Enrollment>[]>(
    () => [
      {
        accessorKey: "studentId",
        header: "STUDENT",
        cell: ({ row }) => {
          const en = row.original;
          const displayName =
            en.firstName || en.lastName ? `${en.firstName ?? ""} ${en.lastName ?? ""}`.trim() : en.email || en.studentId;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{displayName}</span>
              {en.email && <span className="text-xs text-muted-foreground">{en.email}</span>}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "STATUS",
        cell: ({ row }) => <span className="text-sm text-foreground capitalize">{row.original.status}</span>,
      },
      {
        id: "actions",
        header: "ACTIONS",
        cell: ({ row }) => {
          const en = row.original;
          return en.status === "active" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                dropEnrollment.mutate(
                  { enrollmentId: en.id },
                  {
                    onSuccess: () => toast({ title: "Student dropped" }),
                    onError: (err: any) =>
                      toast({
                        title: "Failed to drop",
                        description: err.message,
                        variant: "destructive",
                      }),
                  }
                )
              }
              disabled={dropEnrollment.isPending}
            >
              Drop
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
    ],
    [dropEnrollment, toast]
  );

  const table = useReactTable<Enrollment>({
    data: enrollmentData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    pageCount: Math.ceil(enrollmentData.length / pagination.pageSize),
  });

  const isBatchSelected = !Number.isNaN(batchId);

  return (
    <div className="p-6 space-y-8">
      {/* Batch Details */}
      {isBatchSelected && (
        batchDetail.isLoading ? (
          <div className="rounded-lg border border-border p-4">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-9 w-56" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-52" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : batchDetail.isError ? (
          <p className="text-sm text-destructive">Failed to load batch details.</p>
        ) : batchDetail.data ? (
          <BatchDetailsCard
            batch={batchDetail.data}
            batches={batches}
            batchesLoading={isBatchesLoading}
            onBatchChange={(id) => setLocation(`/app/admin/batches/${id}`)}
          />
        ) : null
      )}

      {!isBatchSelected ? (
        <div className="text-sm text-muted-foreground">
          {batches.length === 0
            ? "No batches found. Create a batch to get started."
            : "Select a batch to view details."}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Enrollments Table */}
          <div className="space-y-4">
            {/* Removed heading - Enrollments (count) */}

            <div className="rounded-md border border-border">
              {enrollments.isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-5 w-56 col-span-1" />
                      <Skeleton className="h-5 w-24 col-span-1" />
                      <Skeleton className="h-8 w-16 col-span-1 justify-self-end" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="text-xs font-medium uppercase tracking-wide">
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {/* Pinned Add Student Row */}
                    <TableRow className="bg-muted/30 hover:bg-muted/50">
                      {/* STUDENT Column - Active Input */}
                      <TableCell className="relative">
                        <div className="relative">
                          <Input
                            ref={inputRef}
                            type="text"
                            name="student-search"
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={showDropdown}
                            placeholder="Type student name or email to enroll..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full"
                            disabled={enrollStudent.isPending}
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                            data-form-type="other"
                          />
                          {eligibleStudents.isFetching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          
                          {/* Typeahead Dropdown */}
                          {showDropdown && (
                            <div
                              ref={dropdownRef}
                              className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
                            >
                              {eligibleStudents.data && eligibleStudents.data.length > 0 ? (
                                eligibleStudents.data.map((student, idx) => {
                                  const displayName = student.firstName || student.lastName
                                    ? `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim()
                                    : student.email;
                                  return (
                                    <button
                                      key={student.id}
                                      type="button"
                                      className={`w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors ${
                                        idx === highlightedIndex ? "bg-accent" : ""
                                      }`}
                                      onClick={() => handleEnroll(student)}
                                      disabled={enrollStudent.isPending}
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-foreground">{displayName}</span>
                                        <span className="text-xs text-muted-foreground">{student.email}</span>
                                      </div>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-4 py-3 text-sm text-muted-foreground">
                                  No eligible students found.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* STATUS Column - Placeholder */}
                      <TableCell>
                        <div className="h-10 bg-muted rounded border border-dashed border-muted-foreground/40" />
                      </TableCell>

                      {/* ACTIONS Column - Placeholder */}
                      <TableCell>
                        <div className="h-10 bg-muted rounded border border-dashed border-muted-foreground/40" />
                      </TableCell>
                    </TableRow>

                    {table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                          No enrollments yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            {!enrollments.isLoading && (
              <DataTablePagination
                currentPage={table.getState().pagination.pageIndex + 1}
                totalPages={table.getPageCount() || 1}
                pageSize={table.getState().pagination.pageSize}
                onPageChange={(page) =>
                  table.setPageIndex(
                    Math.max(0, Math.min(page - 1, Math.max(0, table.getPageCount() - 1)))
                  )
                }
                onPageSizeChange={(size) => table.setPageSize(size)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
