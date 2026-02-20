"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEnrollments, useDropEnrollment } from "@/lib/hooks/useBatchRelations";
import { useBatches } from "@/lib/hooks/useBatches";
import { useBatch } from "@/lib/hooks/useBatch";
import { useTracks } from "@/lib/hooks/useTracks";
import { useChaptersByTrack } from "@/lib/hooks/useChaptersByTrack";
import { useBatchProgress } from "@/lib/hooks/useBatchProgress";
import { useUpdateProficiency } from "@/lib/hooks/useUpdateProficiency";
import { useToast } from "@narada/ui";
import { BatchDetailsCard, type BatchItem } from "@narada/ui";
import { UnifiedBatchMatrix } from "@/components/batches/UnifiedBatchMatrix";
import { TrackTabs } from "@narada/ui";
import { Button } from "@narada/ui";
import { Skeleton } from "@narada/ui";
import { Loader } from "lucide-react";
import type { StudentMatrixRow, Chapter, StudentProgress, ProficiencyLevel } from "@narada/ui";
import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function InstructorBatchDetailsPage() {
    useRoleGuard(["instructor", "admin"]);
    const { toast } = useToast();
    const params = useParams();
    const router = useRouter();
    const batchId = Number(params?.id);
    const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>(undefined);

    const { data: batchesData, isLoading: batchesLoading } = useBatches({ limit: 100, endpoint: "/batches/my-batches" });
    const batches: BatchItem[] = useMemo(() => (batchesData?.items || []).map((b) => ({ ...b, trackName: undefined, status: undefined })) as unknown as BatchItem[], [batchesData]);

    const tracks = useTracks();
    const chapters = useChaptersByTrack(selectedTrackId ? Number(selectedTrackId) : undefined);
    const batchProgress = useBatchProgress(batchId ? batchId : undefined);
    const updateProficiency = useUpdateProficiency();
    const batchDetail = useBatch(isNaN(batchId) ? undefined : batchId);
    const enrollments = useEnrollments(isNaN(batchId) ? 0 : batchId);
    const dropEnrollment = useDropEnrollment(isNaN(batchId) ? 0 : batchId);

    useEffect(() => {
        if (batchDetail.data?.trackId) setSelectedTrackId(String(batchDetail.data.trackId));
        else setSelectedTrackId(undefined);
    }, [batchId, batchDetail.data?.trackId]);

    const isBatchSelected = !Number.isNaN(batchId);

    const matrixStudents: StudentMatrixRow[] = useMemo(
        () =>
            (enrollments.data ?? []).map((enrollment) => ({
                id: enrollment.studentId,
                firstName: enrollment.firstName || "",
                lastName: enrollment.lastName || "",
                email: enrollment.email || "",
                enrollmentId: enrollment.id,
            })),
        [enrollments.data]
    );

    const matrixChapters: Chapter[] = useMemo(
        () =>
            (chapters.data ?? []).map((ch) => ({
                id: String(ch.id),
                code: `CH${ch.order}`,
                title: ch.title,
                trackId: String(ch.trackId),
            })),
        [chapters.data]
    );

    const matrixProgress: StudentProgress[] = useMemo(() => {
        if (!batchProgress.data) return [];
        return batchProgress.data.rows.flatMap((row) =>
            row.cells.map((cell) => ({
                studentId: row.studentId,
                chapterId: String(cell.chapterId),
                proficiencyLevel: (cell.proficiencyLevel ?? 9) as ProficiencyLevel,
                status: cell.proficiencyLevel === null ? "not_started" : cell.proficiencyLevel === 8 ? "absent" : cell.proficiencyLevel === 0 ? "practicing" : cell.proficiencyLevel >= 4 ? "completed" : "practicing",
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
                <Button asChild className="mt-4">
                    <Link href="/instructor/batches">Back to My Batches</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 px-4 py-4 max-w-full overflow-hidden">
            {isBatchSelected &&
                (batchDetail.isLoading ? (
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
                        batch={batchDetail.data as BatchItem}
                        batches={batches}
                        batchesLoading={batchesLoading}
                        onBatchChange={(newBatchId: number) => router.push(`/instructor/batches/${newBatchId}`)}
                    />
                ) : null)}

            {isBatchSelected && (
                <div className="space-y-4">
                    <TrackTabs
                        tracks={(tracks.data ?? []).map((t) => ({ id: String(t.id), name: t.title, code: `Track ${t.order}`, description: t.description ?? undefined, order: t.order }))}
                        selectedTrackId={selectedTrackId}
                        currentTrackId={batchDetail.data?.trackId ? String(batchDetail.data.trackId) : undefined}
                        onSelectTrack={(trackId) => setSelectedTrackId(trackId)}
                        isLoading={tracks.isLoading}
                        emptyMessage="No chapters in this track yet."
                    >
                        {chapters.isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader className="h-6 w-6 animate-spin text-gray-400" />
                                <span className="ml-2 text-sm text-gray-600">Loading chapters...</span>
                            </div>
                        ) : matrixChapters.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
                                <div className="text-sm font-medium text-gray-700">No chapters in this track</div>
                                <div className="mt-2 text-sm text-gray-600">No chapters in this track yet.</div>
                            </div>
                        ) : (
                            <UnifiedBatchMatrix
                                students={matrixStudents}
                                chapters={matrixChapters}
                                progress={matrixProgress}
                                selectedBatchId={String(batchId)}
                                selectedTrackId={selectedTrackId || ""}
                                canEditProficiency={true}
                                onDropStudent={async () => {
                                    toast({ title: "Only administrators can remove students from a batch.", variant: "destructive" });
                                }}
                                onUpdateProficiency={async (studentId, chapterId, level, notes) => {
                                    await updateProficiency.mutateAsync({
                                        batchId: Number(batchId),
                                        studentId,
                                        chapterId: Number(chapterId),
                                        proficiencyLevel: level,
                                        notes,
                                    });
                                }}
                                isUpdating={updateProficiency.isPending}
                            />
                        )}
                    </TrackTabs>
                </div>
            )}
        </div>
    );
}
