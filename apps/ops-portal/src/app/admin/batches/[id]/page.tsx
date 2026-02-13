'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    useEnrollments,
    useDropEnrollment,
    useEligibleStudents,
    useEnrollStudent,
    type EligibleStudent
} from "@/lib/hooks/useBatchRelations";
import { useBatches } from "@/lib/hooks/useBatches";
// Re-using useAdminUsers type logic if needed, but for now let's rely on useBatch
import { useBatch } from "@/lib/hooks/useBatch";
import { useTracks } from "@/lib/hooks/useTracks";
import { useChaptersByTrack } from "@/lib/hooks/useChaptersByTrack";
import { useBatchProgress } from "@/lib/hooks/useBatchProgress";
import { useUpdateProficiency } from "@/lib/hooks/useUpdateProficiency";
import { useToast } from "@narada/ui";

import { BatchDetailsCard, type BatchItem } from "@/components/batches/BatchDetailsCard";
import { UnifiedBatchMatrix } from "@/components/batches/UnifiedBatchMatrix";
import { TrackTabs } from "@/components/batches/TrackTabs";

import { Button } from "@narada/ui";
import { Badge } from "@narada/ui";
import { Input } from "@narada/ui";
import { Skeleton } from "@narada/ui";
import { Loader, Search, X } from "lucide-react";

import type {
    StudentMatrixRow,
    Chapter,
    StudentProgress,
    ProficiencyLevel,
} from "@/components/batches/types";

export default function BatchDetailsPage() {
    const { toast } = useToast();
    const params = useParams();
    const router = useRouter();

    // ID is a string in Next.js params
    const batchId = Number(params?.id);

    // Context is always admin for this page
    const context = 'admin';

    // State management
    const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>(undefined);
    const [matrixSearchQuery, setMatrixSearchQuery] = useState("");
    const [matrixSelectedStudents, setMatrixSelectedStudents] = useState<EligibleStudent[]>([]);
    const [matrixShowTypeahead, setMatrixShowTypeahead] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false);

    // Fetch batches list for dropdown
    const { data: batchesData } = useBatches({ limit: 100 });

    const batches: BatchItem[] = useMemo(() => {
        return (batchesData?.items || []).map(b => ({
            ...b,
            // Ensure compatibility with BatchItem interface
            trackName: undefined, // specific fields might be missing in list view
            status: undefined,
        })) as unknown as BatchItem[];
    }, [batchesData]);

    // Fetch all tracks
    const tracks = useTracks();

    // Fetch chapters for selected track
    const chapters = useChaptersByTrack(
        selectedTrackId ? Number(selectedTrackId) : undefined
    );

    // Fetch batch progress
    const batchProgress = useBatchProgress(batchId ? batchId : undefined);

    // Proficiency update mutation
    const updateProficiency = useUpdateProficiency();

    // Fetch current batch details
    const batchDetail = useBatch(isNaN(batchId) ? undefined : batchId);

    // Fetch enrollments
    const enrollments = useEnrollments(isNaN(batchId) ? 0 : batchId);
    const dropEnrollment = useDropEnrollment(isNaN(batchId) ? 0 : batchId);
    const enrollStudent = useEnrollStudent(isNaN(batchId) ? 0 : batchId);
    const matrixEligibleStudents = useEligibleStudents(isNaN(batchId) ? 0 : batchId, matrixSearchQuery);

    // Reset track when batch changes
    useEffect(() => {
        setMatrixSelectedStudents([]);
        setMatrixSearchQuery("");
        setMatrixShowTypeahead(false);

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
                    description: `${successfulEnrollments.length} added, ${failedEnrollments.length} failed.`,
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

    if (batchDetail.error) {
        return (
            <div className="p-4 text-center">
                <h2 className="text-xl font-semibold text-destructive">Error Loading Batch</h2>
                <p className="text-muted-foreground">{batchDetail.error.message}</p>
                <Button onClick={() => router.push('/admin/batches')} className="mt-4">
                    Back to Batches
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 px-4 py-4 max-w-full overflow-hidden">
            {/* Batch Details Card */}
            {isBatchSelected && (
                batchDetail.isLoading ? (
                    <div className="rounded-lg border border-border p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-9 w-56" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </div>
                ) : batchDetail.data ? (
                    <BatchDetailsCard
                        batch={batchDetail.data as any}
                        batches={batches}
                        // currentBatchId={batchId} // removed prop as it wasn't in clone
                        onBatchChange={(newBatchId: number) => router.push(`/admin/batches/${newBatchId}`)}
                    />
                ) : null
            )}

            {isBatchSelected && (
                <div className="space-y-4">
                    <div className="space-y-4 pt-4">
                        {/* Enrollment Controls */}
                        <div className="flex items-center gap-4">
                            <div className="flex-1 relative">
                                <div className="relative">
                                    <Search className="absolute left-4 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search & Enroll Students ..."
                                        value={matrixSearchQuery}
                                        onChange={(e) => {
                                            const newQuery = e.target.value;
                                            setMatrixSearchQuery(newQuery);
                                            setMatrixShowTypeahead(true);
                                        }}
                                        onFocus={() => setMatrixShowTypeahead(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setMatrixShowTypeahead(false);
                                            }
                                        }}
                                        className="pl-11"
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

                                {/* Typeahead dropdown */}
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
                                                    const isAlreadySelected = matrixSelectedStudents.find(s => s.id === student.id);

                                                    if (isAlreadySelected) return null;

                                                    return (
                                                        <button
                                                            key={student.id}
                                                            type="button"
                                                            onClick={() => handleMatrixSelectStudent(student)}
                                                            className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                                        >
                                                            <div className="font-medium text-sm">{displayName}</div>
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
                                className="shrink-0"
                            >
                                {isAddingStudent ? (
                                    <>
                                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        Enrolling...
                                    </>
                                ) : matrixSelectedStudents.length > 0 ? (
                                    `Enroll (${matrixSelectedStudents.length})`
                                ) : (
                                    'Enroll'
                                )}
                            </Button>
                        </div>

                        {/* Selected students pills */}
                        {matrixSelectedStudents.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {matrixSelectedStudents.map((student) => {
                                    const displayName = student.firstName || student.lastName
                                        ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()
                                        : student.email;
                                    return (
                                        <Badge key={student.id} variant="secondary" className="flex items-center gap-1">
                                            {displayName}
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
                    </div>

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
                            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
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
                                canEditProficiency={false} // Admin view is typically read-only for proficiency? Or clear strict role separation.
                                // Monolith had canEditProficiency={context === 'instructor'}. 
                                // Since this is admin page, let's keep it false for now unless admins should edit grades. 
                                // Usually admins can do everything, but let's stick to monolith parity.
                                onDropStudent={async (enrollmentId) => {
                                    try {
                                        await dropEnrollment.mutateAsync({ enrollmentId });
                                        toast({ title: 'Student removed from batch' });
                                    } catch (err: any) {
                                        toast({
                                            title: 'Failed to remove student',
                                            description: err?.message || 'An error occurred',
                                            variant: 'destructive',
                                        });
                                    }
                                }}
                                onUpdateProficiency={async (studentId, chapterId, level) => {
                                    // Admin edits logic if decided to enable
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
