import React, { useState, useMemo, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ChevronDown, Loader } from "lucide-react";
import type {
  StudentMatrixRow,
  Chapter,
  StudentProgress,
  Track,
  Batch as MatrixBatch,
  ProficiencyLevel,
} from "../types/matrix";

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
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Track selection state (independent of batch)
  const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>(undefined);

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
  const matrixEligibleStudents = useEligibleStudents(isNaN(batchId) ? 0 : batchId, matrixSearchQuery);

  // Auto-redirect to first batch if invalid ID
  useEffect(() => {
    if (Number.isNaN(batchId) && batches.length > 0) {
      setLocation(`/app/${context}/batches/${batches[0].id}`);
    }
  }, [batchId, batches, setLocation, context]);

  // Reset track when batch changes
  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: 10 });
    
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
        proficiencyLevel: (cell.proficiencyLevel ?? 9) as ProficiencyLevel,
        status: cell.proficiencyLevel === null ? 'not_started' 
          : cell.proficiencyLevel === 8 ? 'absent'
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
            batches={batches.map(b => ({ id: b.id, batchCode: b.batchCode, batchName: b.batchName }))}
            currentBatchId={batchId}
            onBatchChange={(newBatchId: number) => setLocation(`/app/${context}/batches/${newBatchId}`)}
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
          {/* Matrix View with Track Tabs */}
          <TrackTabs
                tracks={(tracks.data ?? []).map(t => ({
                  id: String(t.id),
                  name: t.title,
                  code: `Track ${t.order}`,
                  description: t.description ?? undefined,
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
    </div>
  );
}
