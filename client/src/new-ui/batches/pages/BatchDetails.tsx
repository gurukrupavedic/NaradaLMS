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
import { useTracks } from "../hooks/useTracks";
import { useChaptersByTrack, type ChapterListItem } from "../hooks/useChaptersByTrack";
import { useBatchProgress } from "../hooks/useBatchProgress";
import { useUpdateProficiency } from "../hooks/useUpdateProficiency";
import { useToast } from "@/features/shared-features/hooks/use-toast";
import { BatchDetailsCard } from "../../admin/components/BatchDetailsCard";
import { UnifiedBatchMatrix } from "../components/UnifiedBatchMatrix";
import { TrackTabs } from "../components/TrackTabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MoreVertical, ChevronDown, Search, X, Plus, Loader } from "lucide-react";
import type {
  StudentMatrixRow,
  Chapter,
  StudentProgress,
  Track,
  Batch as MatrixBatch,
} from "../types/matrix";

type EnrollmentRow = {
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

  // Track selection state (independent of batch)
  const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>(undefined);
  const [showMatrixView, setShowMatrixView] = useState(false); // Toggle between table and matrix views

  // Enrollment typeahead state (for table view)
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Matrix search state (separate from table search)
  const [matrixSearchQuery, setMatrixSearchQuery] = useState("");
  
  // Matrix enrollment state
  const [matrixSelectedStudents, setMatrixSelectedStudents] = useState<EligibleStudent[]>([]);
  const [matrixShowTypeahead, setMatrixShowTypeahead] = useState(false);
  const [matrixHighlightedIndex, setMatrixHighlightedIndex] = useState(-1);
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Fetch batches based on context
  const adminBatches = useAdminBatches({ limit: 500, offset: 0 });
  const instructorBatches = useInstructorBatches({ limit: 500, offset: 0 });
  
  const batchesData = context === 'admin' ? adminBatches.data : instructorBatches.data;
  const isBatchesLoading = context === 'admin' ? adminBatches.isLoading : instructorBatches.isLoading;
  
  // Fetch all tracks
  const tracks = useTracks();
  
  // Fetch chapters for selected track
  const chapters = useChaptersByTrack(
    selectedTrackId ? Number(selectedTrackId) : undefined
  );

  // Fetch batch progress (proficiency data)
  const batchProgress = useBatchProgress(batchId ? Number(batchId) : undefined);

  // Proficiency update mutation
  const updateProficiency = useUpdateProficiency();
  
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
  const eligibleStudents = useEligibleStudents(isNaN(batchId) ? 0 : batchId, searchQuery); // For table view
  const matrixEligibleStudents = useEligibleStudents(isNaN(batchId) ? 0 : batchId, matrixSearchQuery); // For matrix view

  // Auto-redirect to first batch if invalid ID
  useEffect(() => {
    if (Number.isNaN(batchId) && batches.length > 0) {
      setLocation(`/app/${context}/batches/${batches[0].id}`);
    }
  }, [batchId, batches, setLocation, context]);

  // Reset pagination and track when batch changes
  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: 10 });
    setSearchQuery("");
    setShowDropdown(false);
    
    // Reset matrix UI state when batch changes
    setMatrixSelectedStudents([]);
    setMatrixSearchQuery("");
    setMatrixShowTypeahead(false);
    setMatrixHighlightedIndex(-1);
    
    // Reset track to batch's current track (if available)
    if (batchDetail.data?.trackId) {
      setSelectedTrackId(String(batchDetail.data.trackId));
    } else {
      setSelectedTrackId(undefined);
    }
  }, [batchId, batchDetail.data?.trackId]);

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

  // Matrix enrollment handlers
  const handleMatrixAddStudent = async () => {
    if (matrixSelectedStudents.length === 0) return;
    
    setIsAddingStudent(true);
    const successfulEnrollments: string[] = [];
    const failedEnrollments: Array<{ name: string; error: string }> = [];
    
    try {
      for (const student of matrixSelectedStudents) {
        try {
          await enrollStudent.mutateAsync({ studentId: student.id });
          const displayName = student.firstName || student.lastName
            ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()
            : student.email;
          successfulEnrollments.push(displayName);
        } catch (error: any) {
          const displayName = student.firstName || student.lastName
            ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()
            : student.email;
          failedEnrollments.push({ 
            name: displayName, 
            error: error?.message || 'Unknown error' 
          });
        }
      }
      
      setMatrixSelectedStudents([]);
      setMatrixSearchQuery('');
      setMatrixShowTypeahead(false);
      setMatrixHighlightedIndex(-1);
      
      if (failedEnrollments.length === 0) {
        toast({ 
          title: successfulEnrollments.length === 1 
            ? 'Student added to batch' 
            : `${successfulEnrollments.length} students added to batch` 
        });
      } else if (successfulEnrollments.length === 0) {
        toast({
          title: 'Failed to add student(s)',
          description: failedEnrollments.map(f => `${f.name}: ${f.error}`).join('\n'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Partial success',
          description: `${successfulEnrollments.length} added, ${failedEnrollments.length} failed. Failed: ${failedEnrollments.map(f => f.name).join(', ')}`,
          variant: 'default',
        });
      }
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleMatrixSelectStudent = (student: EligibleStudent) => {
    if (!matrixSelectedStudents.find(s => s.id === student.id)) {
      setMatrixSelectedStudents(prev => [...prev, student]);
    }
    setMatrixSearchQuery('');
    setMatrixShowTypeahead(false);
    setMatrixHighlightedIndex(-1);
  };

  const handleMatrixRemoveStudent = (studentId: string) => {
    setMatrixSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  // Keyboard navigation (table view)
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

  const columns = useMemo<ColumnDef<EnrollmentRow>[]>(
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

  const table = useReactTable<EnrollmentRow>({
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

  // Transform enrollments to StudentMatrixRow array
  const matrixStudents: StudentMatrixRow[] = useMemo(() => {
    return (enrollments.data ?? []).map(enrollment => ({
      id: enrollment.studentId,
      firstName: enrollment.firstName || '',
      lastName: enrollment.lastName || '',
      email: enrollment.email || '',
      enrollmentId: enrollment.id,
    }));
  }, [enrollments.data]);

  // Transform chapters to matrix columns
  const matrixChapters: Chapter[] = useMemo(() => {
    return (chapters.data ?? []).map(ch => ({
      id: String(ch.id),
      code: `CH${ch.order}`,
      title: ch.title,
      trackId: String(ch.trackId),
    }));
  }, [chapters.data]);

  // Transform batch progress to flat StudentProgress array
  const matrixProgress: StudentProgress[] = useMemo(() => {
    if (!batchProgress.data) return [];

    return batchProgress.data.rows.flatMap(row =>
      row.cells.map(cell => ({
        studentId: row.studentId,
        chapterId: String(cell.chapterId),
        proficiencyLevel: cell.proficiencyLevel ?? -1,
        status: cell.proficiencyLevel === null ? 'not_started' 
          : cell.proficiencyLevel === -1 ? 'absent'
          : cell.proficiencyLevel === 0 ? 'practicing'
          : cell.proficiencyLevel >= 4 ? 'completed'
          : 'practicing',
        lastEvaluatedAt: cell.lastEvaluatedAt ?? null,
        evaluatedBy: cell.evaluatedBy ?? null,
        notes: cell.notes ?? null,
      }))
    );
  }, [batchProgress.data]);

  return (
    <div className="space-y-6 px-4 pt-4">
      {/* Page-Level Controls: Batch Selection & View Toggle */}
      <div className="flex flex-wrap items-center gap-6">
        {/* Batch Selector */}
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <label className="text-sm font-medium text-foreground dark:text-gray-100 whitespace-nowrap">
            Batch:
          </label>
          <Select
            value={String(batchId)}
            onValueChange={(value) => setLocation(`/app/${context}/batches/${Number(value)}`)}
            disabled={isBatchesLoading}
          >
            <SelectTrigger className="flex-1 h-9">
              <SelectValue placeholder="-- Select Batch --" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900">
              {batches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.batchCode} - {b.batchName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showMatrixView ? 'default' : 'outline'}
            onClick={() => setShowMatrixView(true)}
          >
            Matrix View
          </Button>
          <Button
            size="sm"
            variant={!showMatrixView ? 'default' : 'outline'}
            onClick={() => setShowMatrixView(false)}
          >
            Table View
          </Button>
        </div>
      </div>

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
          <BatchDetailsCard batch={batchDetail.data} />
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
          {/* Matrix View with Track Tabs */}
          {showMatrixView && (
            <div className="space-y-4">
              {/* Enrollment Controls - Batch Level (Outside Tabs) */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search and add student..."
                      value={matrixSearchQuery}
                      onChange={(e) => {
                        const newQuery = e.target.value;
                        setMatrixSearchQuery(newQuery);
                        setMatrixShowTypeahead(true);
                        setMatrixHighlightedIndex(-1);
                      }}
                      onFocus={() => setMatrixShowTypeahead(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setMatrixShowTypeahead(false);
                        }
                      }}
                      className="pl-9"
                      disabled={isAddingStudent}
                    />
                    {matrixSearchQuery && (
                      <button
                        onClick={() => {
                          setMatrixSearchQuery('');
                          setMatrixShowTypeahead(false);
                        }}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        title="Clear search"
                        type="button"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear search</span>
                      </button>
                    )}
                  </div>

                  {/* Selected students pills */}
                  {matrixSelectedStudents.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {matrixSelectedStudents.map(student => {
                        const displayName = student.firstName || student.lastName
                          ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()
                          : student.email;
                        
                        return (
                          <Badge 
                            key={student.id}
                            variant="secondary"
                            className="flex items-center gap-1 pl-2 pr-1 py-1"
                          >
                            <span className="text-sm">{displayName}</span>
                            <button
                              onClick={() => handleMatrixRemoveStudent(student.id)}
                              className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                              type="button"
                              title={`Remove ${displayName}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Typeahead dropdown with eligible students */}
                  {matrixShowTypeahead && matrixSearchQuery && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white dark:bg-gray-900 shadow-lg">
                      {matrixEligibleStudents.isFetching ? (
                        <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                          <Loader className="h-4 w-4 inline-block animate-spin mr-2" />
                          Searching...
                        </div>
                      ) : (matrixEligibleStudents.data?.length ?? 0) === 0 ? (
                        <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                          No eligible students found
                        </div>
                      ) : (
                        <div className="py-1">
                          {matrixEligibleStudents.data?.map((student, idx) => {
                            const displayName = student.firstName || student.lastName
                              ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()
                              : student.email;
                            
                            return (
                              <button
                                key={student.id}
                                type="button"
                                onClick={() => handleMatrixSelectStudent(student)}
                                onMouseEnter={() => setMatrixHighlightedIndex(idx)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                  idx === matrixHighlightedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                                }`}
                                disabled={isAddingStudent}
                              >
                                <div className="font-medium text-gray-900 dark:text-gray-100">{displayName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{student.email}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleMatrixAddStudent}
                  disabled={matrixSelectedStudents.length === 0 || isAddingStudent}
                  size="sm"
                >
                  {isAddingStudent ? (
                    <>
                      <Loader className="h-4 w-4 mr-1 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add {matrixSelectedStudents.length > 0 && `(${matrixSelectedStudents.length})`}
                    </>
                  )}
                </Button>
              </div>

              {/* Track Tabs with Matrix */}
              <TrackTabs
                tracks={(tracks.data ?? []).map(t => ({
                  id: String(t.id),
                  name: t.title,
                  description: t.description,
                  order: t.order,
                }))}
                selectedTrackId={selectedTrackId}
                currentTrackId={batchDetail.data?.trackId ? String(batchDetail.data.trackId) : undefined}
                onSelectTrack={(trackId) => setSelectedTrackId(trackId)}
                isLoading={tracks.isLoading}
              >
                {chapters.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-600">Loading chapters...</span>
                  </div>
                ) : matrixChapters.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <div className="text-sm font-medium text-gray-700">No chapters in this track</div>
                    <div className="mt-2 text-sm text-gray-600">Add chapters in Content Studio to get started.</div>
                  </div>
                ) : (
                  <UnifiedBatchMatrix
                    students={matrixStudents}
                    chapters={matrixChapters}
                    progress={matrixProgress}
                    selectedBatchId={String(batchId)}
                    selectedTrackId={selectedTrackId || ''}
                    onDropStudent={async (enrollmentId) => {
                      await dropEnrollment.mutateAsync(
                        { enrollmentId },
                        {
                          onSuccess: () => {
                            toast({ title: 'Student removed from batch' });
                          },
                          onError: (err: any) => {
                            toast({
                              title: 'Failed to remove student',
                              description: err?.message || 'An error occurred',
                              variant: 'destructive',
                            });
                          },
                        }
                      );
                    }}
                    onUpdateProficiency={async (studentId, chapterId, level) => {
                      try {
                        await updateProficiency.mutateAsync({
                          batchId: Number(batchId),
                          studentId,
                          chapterId: Number(chapterId),
                          proficiencyLevel: level,
                        });
                      } catch (error: any) {
                        toast({
                          title: 'Failed to update proficiency',
                          description: error?.message || 'An error occurred',
                          variant: 'destructive',
                        });
                      }
                    }}
                    isLoading={enrollments.isLoading}
                    isUpdating={dropEnrollment.isPending || enrollStudent.isPending}
                  />
                )}
              </TrackTabs>
            </div>
          )}

          {/* Table View (Original Enrollments Table) */}
          {!showMatrixView && (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
