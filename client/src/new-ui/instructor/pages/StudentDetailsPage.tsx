import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useStudentDetails } from '../hooks/useStudentDetails';
import { Breadcrumb, type BreadcrumbItem } from '@/components/design-system/Breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, Calendar, Mail, BookOpen } from 'lucide-react';

const PROFICIENCY_COLORS = {
  null: 'bg-gray-100 text-gray-700',
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-green-100 text-green-700',
};

const PROFICIENCY_LABELS: Record<number | null, string> = {
  null: 'Not Evaluated',
  0: 'Not Evaluated',
  1: 'Beginning',
  2: 'Developing',
  3: 'Proficient',
  4: 'Advanced',
};

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

        <div className="border rounded-lg mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chapter</TableHead>
                <TableHead>Proficiency</TableHead>
                <TableHead>Last Accessed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

      {/* Profile and Enrollment Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
        {/* Profile Section */}
        <div className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold text-lg">Profile Information</h2>

          <div>
            <label className="text-sm text-muted-foreground">Full Name</label>
            <p className="font-medium">{fullName}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </label>
            <p className="font-medium">{studentDetails.email}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">User ID</label>
            <p className="font-mono text-sm">{studentDetails.id}</p>
          </div>
        </div>

        {/* Enrollment Section */}
        {studentDetails.enrollment ? (
          <div className="border rounded-lg p-4 space-y-4">
            <h2 className="font-semibold text-lg">Enrollment Information</h2>

            <div>
              <label className="text-sm text-muted-foreground">Batch Code</label>
              <p className="font-mono font-bold text-lg">
                {studentDetails.enrollment.batchCode}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Batch Name</label>
              <p className="font-medium">{studentDetails.enrollment.batchName}</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Track</label>
              <p className="font-medium">{studentDetails.enrollment.trackName}</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Enrolled Since
              </label>
              <p className="font-medium">
                {studentDetails.enrollment.enrolledAt
                  ? new Date(studentDetails.enrollment.enrolledAt).toLocaleDateString()
                  : '—'}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Status</label>
              <Badge
                className={
                  studentDetails.enrollment.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }
              >
                {studentDetails.enrollment.status}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold text-lg mb-2">Enrollment Information</h2>
            <p className="text-muted-foreground">No active enrollment</p>
          </div>
        )}
      </div>

      {/* Proficiency Matrix */}
      {studentDetails.proficiencyMatrix && studentDetails.proficiencyMatrix.length > 0 ? (
        <div className="px-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Proficiency Matrix
            </h2>
            <p className="text-sm text-muted-foreground">
              Chapter-by-chapter progress and evaluation status
            </p>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Chapter</TableHead>
                  <TableHead className="font-semibold">Proficiency</TableHead>
                  <TableHead className="font-semibold">Last Evaluated</TableHead>
                  <TableHead className="font-semibold">Last Accessed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentDetails.proficiencyMatrix.map((record) => (
                  <TableRow key={record.chapterId} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          Ch {record.chapterNumber}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {record.chapterTitle}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${
                          PROFICIENCY_COLORS[
                            record.proficiencyLevel as keyof typeof PROFICIENCY_COLORS
                          ]
                        }`}
                      >
                        {PROFICIENCY_LABELS[record.proficiencyLevel]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.lastEvaluatedAt
                        ? new Date(record.lastEvaluatedAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.lastAccessed
                        ? new Date(record.lastAccessed).toLocaleDateString()
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Proficiency Legend */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-semibold mb-3">Proficiency Levels</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              {[0, 1, 2, 3, 4].map((level) => (
                <div key={level} className="flex items-center gap-2">
                  <div
                    className={`h-6 w-6 rounded ${
                      PROFICIENCY_COLORS[level as keyof typeof PROFICIENCY_COLORS]
                    }`}
                  />
                  <span>{PROFICIENCY_LABELS[level]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-6 text-center">
          <p className="text-muted-foreground">No chapters available for this student</p>
        </div>
      )}
    </div>
  );
}
