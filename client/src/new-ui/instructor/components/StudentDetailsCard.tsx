import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, User, Calendar, Mail } from 'lucide-react';
import type { StudentDetail } from '@shared/types';

interface StudentDetailsCardProps {
  student: StudentDetail;
}

export function StudentDetailsCard({ student }: StudentDetailsCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const fullName = [student.firstName, student.lastName]
    .filter(Boolean)
    .join(' ') || 'Student';

  // Generate roll number from enrollment (if available)
  const rollNumber = student.enrollment
    ? `${student.enrollment.batchCode}-${student.id.slice(0, 3).toUpperCase()}`
    : 'N/A';

  return (
    <Card className="overflow-hidden">
      {/* Collapsible Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-blue-600" />
          </div>

          {/* Collapsed Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg">{fullName}</h3>
              <span className="text-sm text-muted-foreground">({rollNumber})</span>
            </div>
            {student.enrollment && (
              <p className="text-sm text-muted-foreground truncate">
                {student.enrollment.batchCode} - {student.enrollment.batchName}
              </p>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <Button variant="ghost" size="sm" className="ml-2 flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="border-t pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                Profile Information
              </h4>

              <div>
                <label className="text-sm text-muted-foreground">Full Name</label>
                <p className="font-medium">{fullName}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <p className="font-medium">{student.email}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">User ID</label>
                <p className="font-mono text-sm text-muted-foreground">{student.id}</p>
              </div>
            </div>

            {/* Enrollment Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                Enrollment Information
              </h4>

              {student.enrollment ? (
                <>
                  <div>
                    <label className="text-sm text-muted-foreground">Batch Code</label>
                    <p className="font-mono font-bold text-lg">
                      {student.enrollment.batchCode}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Batch Name</label>
                    <p className="font-medium">{student.enrollment.batchName}</p>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Track</label>
                    <p className="font-medium">{student.enrollment.trackName || '—'}</p>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Enrolled Since
                    </label>
                    <p className="font-medium">
                      {student.enrollment.enrolledAt
                        ? new Date(student.enrollment.enrolledAt).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge
                        className={
                          student.enrollment.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {student.enrollment.status}
                      </Badge>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No active enrollment</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
