import { useLocation } from 'wouter';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentDetailsCard } from '@/new-ui/instructor/components/StudentDetailsCard';
import { TrackList } from '@/new-ui/instructor/components/student-progress/TrackList';
import type { ChapterProgress, TrackProgress } from '@shared/types';
import { useMyDetails } from '../hooks/useMyDetails';
import { useMyTrackProgress } from '../hooks/useMyTrackProgress';

export function VedicLearningPage() {
  const [, navigate] = useLocation();

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
    // Use clean URL - all data will be fetched from backend
    navigate(`/app/learning/chapter/${chapter.chapterId}`);
  };

  if (detailsLoading || tracksLoading) {
    return (
      <div className="space-y-6 px-4 pt-4">
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
      <div className="space-y-6 px-4 pt-4">
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
    <div className="space-y-6 px-4 pt-4 pb-8">
      {studentDetails && <StudentDetailsCard student={studentDetails} />}

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
