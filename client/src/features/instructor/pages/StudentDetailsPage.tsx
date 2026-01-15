import { useRoute, useLocation } from 'wouter';
import { useStudentDetails } from '../hooks/useStudentDetails';
import { useTrackProgress } from '../hooks/useTrackProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { StudentDetailsCard } from '../components/StudentDetailsCard';
import { TrackList } from '../components/student-progress/TrackList';
import { useRoleGuard } from '@/features/shared-features/hooks/useRoleGuard';
import { Separator } from '@/components/ui/separator';

export function StudentDetailsPage() {
  useRoleGuard(['instructor']);
  const [, params] = useRoute('/app/instructor/students/:studentId');
  const [, navigate] = useLocation();
  const studentId = params?.studentId;

  const { data: studentDetails, isLoading: detailsLoading, isError: detailsError, error: detailsErrorMsg, refetch: refetchDetails } = useStudentDetails(
    studentId || ''
  );

  const { data: trackProgress, isLoading: tracksLoading, isError: tracksError, error: tracksErrorMsg, refetch: refetchTracks } = useTrackProgress(
    studentId || ''
  );

  if (!studentId) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Student Not Found</h1>
          <Button onClick={() => navigate('/app/instructor/students')} className="mt-4">
            Back to My Students
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (detailsLoading || tracksLoading) {
    return (
      <div className="space-y-4 px-4 py-4">
        {/* Student Details Skeleton */}
        {detailsLoading && (
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
        )}

        {/* Track Progress Skeleton */}
        {tracksLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-6">
                <Skeleton className="h-12 w-full mb-4" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Error state for student details
  if (detailsError) {
    return (
      <div className="space-y-4 px-4 py-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">Failed to load student details.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchDetails()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!studentDetails) {
    return (
      <div className="space-y-4 px-4 py-4">
        <p className="text-center text-muted-foreground">Student not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {/* Student Details Card */}
      <StudentDetailsCard student={studentDetails} />

      <Separator className="my-8 h-[1px] bg-black/5 dark:bg-white/10" />

      {/* Track-wise Progress Section */}
      {tracksError ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Failed to load track progress</p>
                  <p className="text-xs opacity-75">{tracksErrorMsg?.message}</p>
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
          currentTrackId={studentDetails?.enrollment?.trackId}
        />
      ) : trackProgress && trackProgress.trackProgress.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-lg">No tracks assigned</p>
            <p className="text-sm text-muted-foreground mt-2">
              This student has not been assigned to any tracks yet.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
