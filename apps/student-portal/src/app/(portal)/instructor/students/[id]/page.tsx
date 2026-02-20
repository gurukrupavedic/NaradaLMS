"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useStudentDetails, useTrackProgress, useUpdateProficiency } from "@narada/ui";
import { StudentDetailsCard, TrackList } from "@narada/ui";
import { Button, Card, CardContent, Separator, Skeleton } from "@narada/ui";
import { MatrixEvaluationModal } from "@narada/ui";
import type { ChapterProgress, TrackProgress } from "@narada/types";
import type { ProficiencyLevel } from "@narada/ui";

export default function InstructorStudentProgressPage() {
    useRoleGuard(["instructor", "admin"]);
    const params = useParams();
    const studentId = params?.id as string;
    const queryClient = useQueryClient();

    const { data: studentDetails, isLoading: detailsLoading, error: detailsError } = useStudentDetails(studentId);
    const {
        data: trackProgress,
        isLoading: tracksLoading,
        isError: tracksError,
        error: tracksErrorMsg,
        refetch: refetchTracks,
    } = useTrackProgress(studentId);
    const updateProficiency = useUpdateProficiency();

    const [selectedChapter, setSelectedChapter] = useState<ChapterProgress | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleChapterClick = (chapter: ChapterProgress, _track: TrackProgress) => {
        if (!studentDetails?.enrollment) return;
        setSelectedChapter(chapter);
        setModalOpen(true);
    };

    const handleUpdateProficiency = async (level: ProficiencyLevel, notes?: string) => {
        if (!studentDetails?.enrollment || !selectedChapter) return;
        await updateProficiency.mutateAsync({
            batchId: studentDetails.enrollment.batchId,
            studentId: studentDetails.id,
            chapterId: selectedChapter.chapterId,
            proficiencyLevel: level,
            notes,
        });
        queryClient.invalidateQueries({ queryKey: ["studentTrackProgress", studentId] });
        queryClient.invalidateQueries({ queryKey: ["student", studentId] });
        setModalOpen(false);
    };

    if (detailsError) {
        return (
            <div className="p-4">
                <p className="text-destructive">Failed to load student progress.</p>
            </div>
        );
    }

    if (detailsLoading || tracksLoading) {
        return (
            <div className="space-y-4 px-4 py-4 max-w-7xl mx-auto">
                <div className="rounded-lg border border-border bg-card p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="rounded-lg border border-border bg-card p-6">
                            <Skeleton className="h-12 w-full mb-4" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!studentDetails) {
        return null;
    }

    return (
        <div className="space-y-4 px-4 py-4 max-w-7xl mx-auto">
            <StudentDetailsCard student={studentDetails} />

            <Separator className="my-8 h-[1px]" />

            {/* Track-wise Progress Section */}
            {tracksError ? (
                <Card className="border-destructive/30 bg-destructive/10">
                    <CardContent className="py-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-destructive">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">Failed to load track progress</p>
                                    <p className="text-xs opacity-75">
                                        {tracksErrorMsg instanceof Error ? tracksErrorMsg.message : ""}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => refetchTracks()}>
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : trackProgress && trackProgress.trackProgress.length > 0 ? (
                <TrackList
                    tracks={trackProgress.trackProgress}
                    onChapterClick={studentDetails.enrollment ? handleChapterClick : undefined}
                    currentTrackId={studentDetails.enrollment?.trackId}
                />
            ) : trackProgress && trackProgress.trackProgress.length === 0 ? (
                <Card className="bg-muted/30">
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground text-lg">No tracks available</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            This student has not been assigned to any tracks yet.
                        </p>
                    </CardContent>
                </Card>
            ) : null}

            {selectedChapter && (
                <MatrixEvaluationModal
                    isOpen={modalOpen}
                    student={{
                        id: studentDetails.id,
                        firstName: studentDetails.firstName ?? "",
                        lastName: studentDetails.lastName ?? "",
                        email: studentDetails.email,
                        enrollmentId: studentDetails.enrollment?.enrollmentId ?? 0,
                    }}
                    chapter={{
                        id: String(selectedChapter.chapterId),
                        code: selectedChapter.chapterCode,
                        title: selectedChapter.chapterTitle,
                        trackId: "",
                    }}
                    currentProficiency={(selectedChapter.proficiencyLevel ?? 9) as ProficiencyLevel}
                    onClose={() => setModalOpen(false)}
                    onUpdate={handleUpdateProficiency}
                    isUpdating={updateProficiency.isPending}
                    isError={updateProficiency.isError}
                    errorMessage={updateProficiency.error?.message}
                />
            )}
        </div>
    );
}
