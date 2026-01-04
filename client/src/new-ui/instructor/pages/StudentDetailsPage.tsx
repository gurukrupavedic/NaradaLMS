import { useRoute, useLocation } from 'wouter';
import { useStudentDetails } from '../hooks/useStudentDetails';
import { Breadcrumb, type BreadcrumbItem } from '@/components/design-system/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft } from 'lucide-react';
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
      <div className="space-y-4 p-4">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/instructor/students')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Students
          </Button>
        </div>

        <div className="mb-2">
          <Skeleton className="h-4 w-96" />
        </div>

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

        <div className="border rounded-lg mt-6 p-6">
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-4 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/instructor/students')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Students
        </Button>

        <div className="flex items-center gap-4 p-4 border border-red-200 bg-red-50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-900">
              {error instanceof Error ? error.message : 'Failed to load student details'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!studentDetails) {
    return (
      <div className="space-y-4 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/instructor/students')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Students
        </Button>
        <p className="text-center text-muted-foreground">Student not found</p>
      </div>
    );
  }

  const fullName = [studentDetails.firstName, studentDetails.lastName]
    .filter(Boolean)
    .join(' ') || 'Student';

  return (
    <div className="space-y-4 p-4">
      {/* Back button and breadcrumb */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/app/instructor/students')}
        className="gap-2 mb-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Students
      </Button>

      <div className="px-2">
        <Breadcrumb
          items={[
            { label: 'Batches & Progress', href: '/app/instructor/batches' },
            { label: 'My Students', href: '/app/instructor/students' },
            { label: `${fullName} - Progress`, active: true },
          ]}
          variant="blue"
          size="sm"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-bold">Student Progress</h1>
          <p className="text-muted-foreground">{fullName} • {studentDetails.email}</p>
        </div>
      </div>

      {/* Student Details Card */}
      <div className="px-2">
        <StudentDetailsCard student={studentDetails} />
      </div>

      {/* Track-wise Progress - Placeholder for Phase D */}
      <div className="px-2">
        <Card className="bg-gray-50">
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
    </div>
  );
}
