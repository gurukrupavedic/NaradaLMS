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
import { useEnrollments, useDropEnrollment, useEligibleStudents, useEnrollStudent, type EligibleStudent } from "../../admin/hooks/useBatchRelations";
import { useBatches as useAdminBatches, type Batch as AdminBatch } from "../../admin/hooks/useBatches";
import { useBatch as useAdminBatch } from "../../admin/hooks/useBatch";
import { useBatches as useInstructorBatches, type BatchItem } from "../hooks/useBatches";
import { useToast } from "@/features/shared-features/hooks/use-toast";
import { BatchDetailsCard } from "../../admin/components/BatchDetailsCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MoreVertical } from "lucide-react";

type Enrollment = {
  id: number;
  studentId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status: string;
};

// Unified batch type for dropdown purposes
type UnifiedBatch = {
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
};

export default function BatchDetails() {
  const { toast } = useToast();
  
  // Dual route detection
  const [, adminParams] = useRoute("/app/admin/batches/:id");
  const [, instructorParams] = useRoute("/app/instructor/batches/:id");
  const [, setLocation] = useLocation();
  
  // Determine context and batch ID
  const context = adminParams ? 'admin' : 'instructor';
  const batchId = Number(adminParams?.id || instructorParams?.id);
  
  // State management
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

  // Fetch batches based on context
  const adminBatches = useAdminBatches({ limit: 500, offset: 0 });
  const instructorBatches = useInstructorBatches({ limit: 500, offset: 0 });
  
  const batchesData = context === 'admin' ? adminBatches.data : instructorBatches.data;
  const isBatchesLoading = context === 'admin' ? adminBatches.isLoading : instructorBatches.isLoading;
  
  // Convert batches to unified format for dropdown compatibility
  const batches: UnifiedBatch[] = useMemo(() => {
    const items = batchesData?.items ?? [];
    if (context === 'admin') {
      return (items as AdminBatch[]).map(b => ({
        id: b.id,
        batchCode: b.batchCode,
        batchName: b.batchName,
        trackId: b.trackId,
        primaryInstructorId: b.primaryInstructorId,
        cohortType: b.cohortType,
        description: b.description,
        studentCount: b.studentCount,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }));
    } else {
      return (items as BatchItem[]).map(b => ({
        id: b.id,
        batchCode: b.batchCode,
        batchName: b.batchName,
        trackId: b.trackId,
        primaryInstructorId: b.primaryInstructorId,
        cohortType: b.cohortType,
        description: b.description,
        studentCount: b.studentCount,
        createdAt: typeof b.createdAt === 'string' ? b.createdAt : b.createdAt?.toISOString(),
        updatedAt: typeof b.updatedAt === 'string' ? b.updatedAt : b.updatedAt?.toISOString(),
      }));
    }
  }, [batchesData, context]);

  // Fetch current batch details with full relations (used for both admin and instructor)
  const batchDetail = useAdminBatch(isNaN(batchId) ? undefined : batchId);
  
  // Fetch enrollments - only when we have a valid batch ID
  const enrollments = useEnrollments(isNaN(batchId) ? 0 : batchId);
  const dropEnrollment = useDropEnrollment(isNaN(batchId) ? 0 : batchId);
  const enrollStudent = useEnrollStudent(isNaN(batchId) ? 0 : batchId);
  const eligibleStudents = useEligibleStudents(isNaN(batchId) ? 0 : batchId, searchQuery);

  // Auto-redirect to first batch if invalid ID
  useEffect(() => {
    if (Number.isNaN(batchId) && batches.length > 0) {
      setLocation(`/app/${context}/batches/${batches[0].id}`);
    }
  }, [batchId, batches, setLocation, context]);

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

  const columns = useMemo<ColumnDef<Enrollment>[]>(
    () => [
      {
        accessorKey: "studentId",
        header: "STUDENT",
        cell: ({ row }) => {
          const en = row.original;
          const displayName =
            en.firstName || en.lastName ? `${en.firstName ?? ""} ${en.lastName ?? ""}`.trim() : en.email || en.studentId;
          return <span className="text-sm font-medium text-foreground">{displayName}</span>;
        },
      },
      {
        accessorKey: "email",
        header: "CONTACT",
        cell: ({ row }) => <span className="text-sm text-foreground">{row.original.email || "—"}</span>,
      },
      {
        id: "timezone",
        header: "TIMEZONE",
        cell: () => <span className="text-sm text-foreground">—</span>,
      },
      {
        id: "lastActive",
        header: "LAST ACTIVE",
        cell: () => <span className="text-sm text-muted-foreground">—</span>,
      },
      {
        id: "progress",
        header: "PROGRESS",
        cell: () => <span className="text-sm text-foreground">—</span>,
      },
      {
        id: "actions",
        header: "ACTIONS",
        size: 50,
        cell: ({ row }) => {
          const en = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white dark:bg-black border border-border shadow-lg min-w-[180px]"
              >
                <DropdownMenuItem
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
                  className="text-destructive focus:text-destructive"
                >
                  Drop
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
    <div className="space-y-6 px-4 pt-4">
      {/* Batch Details Card - Same for both admin and instructor */}
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
          </div>
        ) : batchDetail.isError ? (
          <p className="text-sm text-destructive">Failed to load batch details.</p>
        ) : batchDetail.data ? (
          <BatchDetailsCard
            batch={batchDetail.data}
            batches={batches}
            batchesLoading={isBatchesLoading}
            onBatchChange={(id) => setLocation(`/app/${context}/batches/${id}`)}
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
          {/* Enrollments Section */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Enrollments</h2>
            
            {/* Enrollments Table */}
            <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
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
                  <TableHeader className="bg-muted/40 sticky top-0 z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="border-b border-border/60 hover:bg-transparent">
                        {headerGroup.headers.map((header) => (
                          <TableHead 
                            key={header.id} 
                            className="text-xs font-bold text-foreground/70 uppercase tracking-widest"
                            style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                          >
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {/* Pinned Add Student Row */}
                    <TableRow className="border-b border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors">
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
                            placeholder="Type student name to enroll..."
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

                      {/* CONTACT Column - Placeholder */}
                      <TableCell>
                        <div className="h-10 bg-muted rounded border border-dashed border-muted-foreground/40" />
                      </TableCell>

                      {/* TIMEZONE Column - Placeholder */}
                      <TableCell>
                        <div className="h-10 bg-muted rounded border border-dashed border-muted-foreground/40" />
                      </TableCell>

                      {/* LAST ACTIVE Column - Placeholder */}
                      <TableCell>
                        <div className="h-10 bg-muted rounded border border-dashed border-muted-foreground/40" />
                      </TableCell>

                      {/* PROGRESS Column - Placeholder */}
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
                        <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                          No enrollments yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell 
                              key={cell.id}
                              style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
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
