import { useRoute, useLocation } from 'wouter';
import { useStudentDetails } from '../hooks/useStudentDetails';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { StudentDetailsCard } from '../components/StudentDetailsCard';

export function StudentDetailsPage() {
  const [, params] = useRoute('/app/instructor/students/:studentId');
  const [, navigate] = useLocation();
  const studentId = params?.studentId;

  const { data: studentDetails, isLoading, isError, error, refetch } = useStudentDetails(
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
  if (isLoading) {
    return (
      <div className="space-y-6 px-4 pt-4">
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

        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6 px-4 pt-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Failed to load student details.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!studentDetails) {
    return (
      <div className="space-y-6 px-4 pt-4">
        <p className="text-center text-muted-foreground">Student not found</p>
      </div>
    );
  }

  const fullName = [studentDetails.firstName, studentDetails.lastName]
    .filter(Boolean)
    .join(' ') || 'Student';

  return (
    <div className="space-y-6 px-4 pt-4">
      {/* Student Details Card */}
      <StudentDetailsCard student={studentDetails} />

      {/* Track-wise Progress - Placeholder for Phase D */}
      <Card className="bg-muted/30">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">
            Track-wise Progress Tracking — Coming Soon
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Detailed chapter-by-chapter proficiency tracking will be displayed here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
