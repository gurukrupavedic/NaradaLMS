'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button, Card, CardContent, Skeleton, Separator } from '@narada/ui';

import { StudentDetailsCard } from '@/components/dashboard/StudentDetailsCard';
import { TrackList } from '@/components/dashboard/student-progress/TrackList';
import { useMyDetails } from '@/hooks/useMyDetails';
import { useMyTrackProgress } from '@/hooks/useMyTrackProgress';
import type { ChapterProgress, TrackProgress } from '@narada/types';

export default function VedicLearningPage() {
    const router = useRouter();

    const {
        data: studentDetails,
        isLoading: detailsLoading,
        isError: detailsError,
        error: detailsErrorMsg,
        refetch: refetchDetails,
    } = useMyDetails();

    const {
        data: trackProgress,
        isLoading: tracksLoading,
        isError: tracksError,
        error: tracksErrorMsg,
        refetch: refetchTracks,
    } = useMyTrackProgress();

    const handleChapterClick = (chapter: ChapterProgress, track: TrackProgress) => {
        router.push(`/learning/chapter/${chapter.chapterId}`);
    };

    if (detailsLoading || tracksLoading) {
        return (
            <div className="space-y-4 px-4 py-4 max-w-7xl mx-auto">
                {/* Student Details Skeleton */}
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

                {/* Track Progress Skeleton */}
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

    if (detailsError) {
        return (
            <div className="space-y-4 px-4 py-4 max-w-7xl mx-auto">
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <p className="text-sm font-medium">Failed to load learning details.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => refetchDetails()}>
                            Retry
                        </Button>
                    </div>
                    {detailsErrorMsg instanceof Error && (
                        <p className="text-xs opacity-75 mt-2">{detailsErrorMsg.message}</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 px-4 py-4 max-w-7xl mx-auto">
            {studentDetails && <StudentDetailsCard student={studentDetails} />}

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
                                    <p className="text-xs opacity-75">{tracksErrorMsg instanceof Error ? tracksErrorMsg.message : ''}</p>
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
                    onChapterClick={handleChapterClick}
                    currentTrackId={studentDetails?.enrollment?.trackId}
                />
            ) : trackProgress && trackProgress.trackProgress.length === 0 ? (
                <Card className="bg-muted/30">
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground text-lg">No tracks available</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            You have not been assigned to any tracks yet.
                        </p>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
