import { useState } from 'react';
import { Badge } from '@narada/ui/components/badge';
import { ChevronDown, User } from 'lucide-react';
import type { StudentDetail } from '@narada/types';

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
    <div className="rounded-lg border border-border bg-card px-4 pb-4 pt-2 relative">
      {/* Collapsible Header */}
      <div
        className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/30 -mx-4 px-4 py-2 rounded-t-lg transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded ? "true" : "false"}
        aria-label={isExpanded ? "Collapse student details" : "Expand student details"}
      >


        {/* Header Content - Always visible name, conditional collapsed summary */}
        {isExpanded ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base leading-normal">{fullName}</h3>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-foreground flex-1 min-w-0">
            <span className="font-medium truncate">{fullName}</span>
            {student.enrollment && (
              <>
                <span className="opacity-60 flex-shrink-0">•</span>
                <span className="font-mono flex-shrink-0">{student.enrollment.batchCode}</span>
                <span className="opacity-60 flex-shrink-0">•</span>
                <span className="truncate">{student.enrollment.batchName}</span>
              </>
            )}
          </div>
        )}

        {/* Expand/Collapse Icon - purely decorative, parent handles interaction */}
        <div className="p-0.5 text-foreground/60 pointer-events-none flex-shrink-0">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="pt-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">


            {/* Email */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                Email
              </p>
              <p className="text-sm text-foreground mt-1">{student.email}</p>
            </div>

            {/* User ID */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                User ID
              </p>
              <p className="text-sm font-mono text-muted-foreground mt-1">{student.id}</p>
            </div>

            {student.enrollment ? (
              <>
                {/* Batch Code */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                    Batch Code
                  </p>
                  <p className="text-sm font-mono text-foreground mt-1">
                    {student.enrollment.batchCode}
                  </p>
                </div>

                {/* Batch Name */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                    Batch Name
                  </p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {student.enrollment.batchName}
                  </p>
                </div>

                {/* Track */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                    Track
                  </p>
                  <p className="text-sm text-foreground mt-1">
                    {student.enrollment.trackName || '—'}
                  </p>
                </div>

                {/* Enrolled Since */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                    Enrolled Since
                  </p>
                  <p className="text-sm text-foreground mt-1">
                    {student.enrollment.enrolledAt
                      ? new Date(student.enrollment.enrolledAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                      : '—'}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                    Status
                  </p>
                  <div className="mt-1">
                    <Badge variant={student.enrollment.status === 'active' ? 'default' : 'secondary'}>
                      {student.enrollment.status}
                    </Badge>
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-2 md:col-span-3">
                <p className="text-sm text-muted-foreground">No active enrollment</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
