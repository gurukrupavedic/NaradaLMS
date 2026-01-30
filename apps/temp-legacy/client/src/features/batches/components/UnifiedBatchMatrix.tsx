'use client';

import { useState, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from '@tanstack/react-table';
import { ChevronDown, Loader, MoreVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/features/shared/hooks/use-toast';

import {
  Chapter,
  StudentMatrixRow,
  StudentProgress,
  UnifiedBatchMatrixProps,
  MatrixCell,
  ProficiencyLevel,
  EligibleStudent,
} from '../types/matrix';
import { getCellColor, getProficiencyShortLabel } from '../utils/matrix-utils';
import { MatrixEvaluationModal } from './MatrixEvaluationModal';

/**
 * UnifiedBatchMatrix Component
 * 
 * Pure presentation component for the proficiency matrix.
 * 
 * Renders a matrix with:
 * - Rows: Students enrolled in the batch
 * - Columns: Chapters in the selected track
 * - Cells: Student proficiency on each chapter (clickable for evaluation)
 * 
 * Features:
 * - Sticky student column (left)
 * - Kebab menu [⋮] for dropping students
 * - Color-coded proficiency cells
 * - Modal for updating proficiency levels
 * - Loading and error states
 * 
 * Note: Enrollment controls are handled by the parent component (BatchDetails)
 */
export function UnifiedBatchMatrix({
  students,
  chapters,
  progress,
  selectedBatchId,
  selectedTrackId,
  onDropStudent,
  onUpdateProficiency,
  isLoading = false,
  isUpdating = false,
  canEditProficiency = true,
}: UnifiedBatchMatrixProps) {
  const { toast } = useToast();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    studentId: string;
    chapterId: string;
  } | null>(null);

  // Track which cell is being updated for loading state
  const [updatingCell, setUpdatingCell] = useState<{
    studentId: string;
    chapterId: string;
  } | null>(null);

  // Build progress lookup for O(1) access
  const progressMap = useMemo(() => {
    const map = new Map<string, StudentProgress>();
    progress.forEach((p) => {
      map.set(`${p.studentId}-${p.chapterId}`, p);
    });
    return map;
  }, [progress]);

  // Get matrix cell data
  const getMatrixCell = (studentId: string, chapterId: string): MatrixCell => {
    const key = `${studentId}-${chapterId}`;
    const prog = progressMap.get(key);

    if (!prog) {
      return {
        studentId,
        chapterId,
        proficiencyLevel: 9,
        status: 'not_started',
        isEmpty: true,
      };
    }

    return {
      studentId,
      chapterId,
      proficiencyLevel: prog.proficiencyLevel,
      status: prog.status,
      isEmpty: false,
    };
  };

  // Handle drop student
  const handleDropStudent = async (enrollmentId: number, studentName: string) => {
    try {
      await onDropStudent(enrollmentId);
      toast({ title: `${studentName} removed from batch` });
    } catch (error: any) {
      toast({
        title: 'Failed to remove student',
        description: error?.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  // Handle proficiency update from modal
  const handleUpdateProficiency = async (level: ProficiencyLevel) => {
    if (!selectedCell) return;

    try {
      // Set loading state for this specific cell
      setUpdatingCell({ studentId: selectedCell.studentId, chapterId: selectedCell.chapterId });

      await onUpdateProficiency(selectedCell.studentId, selectedCell.chapterId, level);

      toast({ title: 'Proficiency updated' });
      setModalOpen(false);
      setSelectedCell(null);
    } catch (error: any) {
      toast({
        title: 'Failed to update proficiency',
        description: error?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      // Clear loading state
      setUpdatingCell(null);
    }
  };

  // Cell click handler - open modal for evaluation
  const handleCellClick = (studentId: string, chapterId: string) => {
    setSelectedCell({ studentId, chapterId });
    setModalOpen(true);
  };

  // Get initials from student name for badge
  const getInitials = (firstName: string, lastName: string): string => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return (first + last).slice(0, 2);
  };

  // Assign consistent colors to student initials based on hash
  const getInitialBgColor = (studentId: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-cyan-500',
    ];
    const hash = studentId.charCodeAt(0) + studentId.charCodeAt(studentId.length - 1);
    return colors[hash % colors.length];
  };

  // TanStack Table setup
  const columnHelper = createColumnHelper<StudentMatrixRow>();

  const columns = [
    // Student column (sticky)
    columnHelper.accessor('id', {
      id: 'student',
      header: 'Student',
      cell: (info) => {
        const student = info.row.original;
        return (
          <div className="pl-4 pr-2 py-2 flex items-center gap-2 min-w-0">
            {/* Student Initials Badge */}
            <div
              className={`${getInitialBgColor(
                student.id
              )} text-white font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-xs`}
              title={`${student.firstName} ${student.lastName}`}
            >
              {getInitials(student.firstName, student.lastName)}
            </div>

            {/* Student Info */}
            <div className="min-w-0">
              <div className="truncate font-medium text-sm">
                {student.firstName} {student.lastName}
              </div>
              <div className="truncate text-xs text-gray-500">{student.email}</div>
            </div>
          </div>
        );
      },
      size: 220,
      enableSorting: false,
      enableHiding: false,
    }),

    // Actions column (sticky)
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="data-[state=open]:bg-muted"
                  title="Student actions menu"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Student actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover border border-border shadow-lg min-w-[180px]"
              >
                <DropdownMenuItem
                  onClick={() =>
                    handleDropStudent(student.enrollmentId, `${student.firstName} ${student.lastName}`)
                  }
                  className="text-destructive focus:text-destructive"
                >
                  Drop Student
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      size: 44,
      enableSorting: false,
      enableHiding: false,
    }),

    // Chapter columns (dynamic)
    ...chapters.map((chapter) =>
      columnHelper.accessor((row) => row.id, {
        id: `chapter-${chapter.id}`,
        header: () => (
          <div className="px-2 py-2 flex flex-col items-center justify-center gap-0.5">
            <div className="text-xs font-bold text-gray-900 whitespace-nowrap text-center">
              {chapter.code}
            </div>
            <div className="text-[10px] text-gray-600 line-clamp-2 text-center" title={chapter.title}>
              {chapter.title}
            </div>
          </div>
        ),
        cell: (info) => {
          const studentId = info.row.original.id;
          const cell = getMatrixCell(studentId, chapter.id);
          const colors = getCellColor(cell.proficiencyLevel, cell.status);

          // Check if this specific cell is being updated
          const isCellUpdating = updatingCell?.studentId === studentId && updatingCell?.chapterId === chapter.id;

          return (
            <div className="px-2 py-2 flex items-center justify-center">
              <button
                onClick={() => canEditProficiency && handleCellClick(studentId, chapter.id)}
                disabled={isUpdating || !canEditProficiency || isCellUpdating}
                className={`
                  h-14 w-20 flex items-center justify-center rounded-lg
                  border-2 transition-all relative
                  ${colors.bgColor} ${colors.darkBgColor} ${colors.textColor} ${colors.darkTextColor} ${colors.borderColor} ${colors.darkBorderColor}
                  ${canEditProficiency && !isCellUpdating ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed'}
                  ${isCellUpdating ? 'opacity-60' : ''}
                  font-semibold text-sm
                `}
                title={canEditProficiency ? `${info.row.original.firstName} - ${chapter.code}` : 'Only instructors can update proficiency'}
              >
                {isCellUpdating ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  getProficiencyShortLabel(cell.proficiencyLevel)
                )}
              </button>
            </div>
          );
        },
        size: undefined,
        enableSorting: false,
      })
    ),
  ];

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),

  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600">Loading matrix...</span>
      </div>
    );
  }

  // Empty state
  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <div className="text-sm font-medium text-gray-700">No students in this batch</div>
        <div className="mt-2 text-sm text-gray-600">Add students below to get started</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Matrix Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[75vh] rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full border-collapse table-fixed">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b-2 border-border bg-muted/50">
                {headerGroup.headers.map((header) => {
                  const isSticky = header.id === 'student' || header.id === 'actions';
                  const isStudentCol = header.id === 'student';
                  const stickyLeftStyle = isSticky ? `${header.column.getStart()}px` : '0';

                  return (
                    // eslint-disable-next-line @stylistic/no-non-null-assertion
                    <th
                      key={header.id}
                      className={`${isStudentCol ? 'text-center' : 'text-center'} text-xs font-semibold text-muted-foreground uppercase tracking-tight ${isStudentCol ? 'pl-4 pr-2 py-2 align-middle' : 'p-0'
                        } sticky top-0 ${isSticky ? 'z-30' : 'z-10'} bg-card`}
                      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                      style={{
                        width: `${header.getSize()}px`,
                        maxWidth: `${header.getSize()}px`, // Prevent expansion
                        ...(isSticky && { left: stickyLeftStyle }),
                      } as any}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => {
                  const isSticky = cell.column.id === 'student' || cell.column.id === 'actions';
                  const stickyCellLeftStyle = isSticky ? `${cell.column.getStart()}px` : '0';

                  return (
                    // eslint-disable-next-line @stylistic/no-non-null-assertion
                    <td
                      key={cell.id}
                      className={`align-middle ${isSticky ? 'sticky z-20 bg-card p-0' : 'p-0 text-center'
                        }`}
                      style={{
                        width: `${cell.column.getSize()}px`,
                        maxWidth: `${cell.column.getSize()}px`, // Prevent expansion
                        ...(isSticky && { left: stickyCellLeftStyle }),
                      } as any}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for updating proficiency */}
      {selectedCell && (
        <MatrixEvaluationModal
          isOpen={modalOpen}
          student={students.find((s) => s.id === selectedCell.studentId)}
          chapter={chapters.find((c) => c.id === selectedCell.chapterId)}
          currentProficiency={
            progressMap.get(`${selectedCell.studentId}-${selectedCell.chapterId}`)?.proficiencyLevel
          }
          onClose={() => {
            setModalOpen(false);
            setSelectedCell(null);
          }}
          onUpdate={handleUpdateProficiency}
          isUpdating={isUpdating}
        />
      )}


    </div>
  );
}
