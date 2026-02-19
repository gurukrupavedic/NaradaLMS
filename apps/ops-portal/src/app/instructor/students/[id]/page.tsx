'use client';

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStudentDetails } from "@/lib/hooks/useStudentDetails";
import { useTrackProgress } from "@/lib/hooks/useTrackProgress";
import { useUpdateProficiency } from "@/lib/hooks/useUpdateProficiency";
import { useToast } from "@narada/ui";
import { Button } from "@narada/ui";
import { Skeleton } from "@narada/ui";
import { ChevronLeft } from "lucide-react";

import { StudentDetailsCard, TrackList } from "@narada/ui";
import { MatrixEvaluationModal } from "@/components/batches/MatrixEvaluationModal";
import { ProficiencyLevel, Chapter, StudentMatrixRow } from "@/components/batches/types";
import type { ChapterProgress, TrackProgress } from "@narada/types";

export default function StudentProgressPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const studentId = String(params?.id);

    // Data fetching
    const { data: student, isLoading: isStudentLoading, error: studentError } = useStudentDetails(studentId);
    const { data: trackProgressData, isLoading: isProgressLoading, error: progressError, refetch: refetchProgress } = useTrackProgress(studentId);
    const updateProficiency = useUpdateProficiency();

    // State for modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedChapter, setSelectedChapter] = useState<{ chapter: ChapterProgress, track: TrackProgress } | null>(null);

    // Derived state
    const isLoading = isStudentLoading || isProgressLoading;
    const tracks = trackProgressData?.trackProgress || [];

    // Handlers
    const handleChapterClick = (chapter: ChapterProgress, track: TrackProgress) => {
        // Only allow evaluation if instructor has access (implied by page access)
        // Set selected chapter and open modal
        setSelectedChapter({ chapter, track });
        setIsModalOpen(true);
    };

    const handleUpdateProficiency = async (level: ProficiencyLevel, notes?: string) => {
        if (!student || !selectedChapter || !student.enrollment) return;

        try {
            await updateProficiency.mutateAsync({
                batchId: student.enrollment.batchId,
                studentId: student.id,
                chapterId: Number(selectedChapter.chapter.chapterId),
                proficiencyLevel: level,
                notes
            });

            toast({ title: "Progress updated" });
            setIsModalOpen(false);
            setSelectedChapter(null);
            refetchProgress(); // Refresh progress to show new status
        } catch (error: any) {
            toast({
                title: "Error updating progress",
                description: error?.message || "Something went wrong",
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Skeleton className="h-40 w-full rounded-lg" />
                <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        );
    }

    if (studentError || progressError || !student) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-destructive">Error loading student data</h3>
                <p className="text-muted-foreground mb-4">
                    {(studentError as Error)?.message || (progressError as Error)?.message || "Student not found"}
                </p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    // Prepare data for modal
    const modalStudent: StudentMatrixRow | undefined = student ? {
        id: student.id,
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email,
        enrollmentId: student.enrollment?.enrollmentId || 0,
    } : undefined;

    const modalChapter: Chapter | undefined = selectedChapter ? {
        id: String(selectedChapter.chapter.chapterId),
        code: selectedChapter.chapter.chapterCode,
        title: selectedChapter.chapter.chapterTitle,
        trackId: String(selectedChapter.track.trackId)
    } : undefined;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header / Nav */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Students
                </Button>
            </div>

            {/* Student Details Card */}
            <StudentDetailsCard student={student} />

            {/* Track Progress List */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Curriculum Progress</h2>
                {tracks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                        No enrolled tracks found for this student.
                    </div>
                ) : (
                    <TrackList
                        tracks={tracks}
                        onChapterClick={handleChapterClick}
                        currentTrackId={student.enrollment?.trackId}
                    />
                )}
            </div>

            {/* Evaluation Modal */}
            {isModalOpen && modalStudent && modalChapter && (
                <MatrixEvaluationModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    student={modalStudent}
                    chapter={modalChapter}
                    currentProficiency={selectedChapter?.chapter.proficiencyLevel as ProficiencyLevel | undefined}
                    onUpdate={handleUpdateProficiency}
                    isUpdating={updateProficiency.isPending}
                />
            )}
        </div>
    );
}
