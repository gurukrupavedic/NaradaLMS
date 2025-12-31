'use client';

import { useState, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from '@tanstack/react-table';
import { ChevronDown, Loader, MoreVertical, Plus, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/features/shared-features/hooks/use-toast';

import {
  Chapter,
  StudentMatrixRow,
  StudentProgress,
  UnifiedBatchMatrixProps,
  MatrixCell,
  ProficiencyLevel,
} from '../types/matrix';
import { getCellColor, getProficiencyShortLabel } from '../utils/matrix-utils';
import { MatrixEvaluationModal } from './MatrixEvaluationModal';

/**
 * UnifiedBatchMatrix Component
 * 
 * Renders a matrix with:
 * - Rows: Students enrolled in the batch
 * - Columns: Chapters in the selected track
 * - Cells: Student proficiency on each chapter (clickable for evaluation)
 * 
 * Features:
 * - Sticky student column (left)
 * - Kebab menu [⋮] inline with student names
 * - Color-coded proficiency cells
 * - Pinned input row for adding new students
 * - Type-ahead search for student selection
 * - Modal for updating proficiency levels
 * - Loading and error states
 */
export function UnifiedBatchMatrix({
  students,
  chapters,
  progress,
  selectedBatchId,
  selectedTrackId,
  onAddStudent,
  onDropStudent,
  onUpdateProficiency,
  isLoading = false,
  isUpdating = false,
}: UnifiedBatchMatrixProps) {
  const { toast } = useToast();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    studentId: string;
    chapterId: string;
  } | null>(null);

  // Typeahead state for adding students
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeahead, setShowTypeahead] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isAddingStudent, setIsAddingStudent] = useState(false);

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
        proficiencyLevel: -1,
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

  // Handle add student with typeahead
  const handleAddStudent = async (studentId: string) => {
    setIsAddingStudent(true);
    try {
      await onAddStudent(studentId);
      setSearchQuery('');
      setShowTypeahead(false);
      setHighlightedIndex(-1);
      toast({ title: 'Student added to batch' });
    } catch (error: any) {
      toast({
        title: 'Failed to add student',
        description: error?.message || 'Check if student is already enrolled',
        variant: 'destructive',
      });
    } finally {
      setIsAddingStudent(false);
    }
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
    }
  };

  // Cell click handler - open modal for evaluation
  const handleCellClick = (studentId: string, chapterId: string) => {
    setSelectedCell({ studentId, chapterId });
    setModalOpen(true);
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
          <div className="flex items-center justify-between gap-3 pr-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {student.firstName} {student.lastName}
              </div>
              <div className="truncate text-xs text-gray-500">{student.email}</div>
            </div>

            {/* Kebab menu [⋮] */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  title="Student actions menu"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Student actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    handleDropStudent(student.enrollmentId, `${student.firstName} ${student.lastName}`)
                  }
                  className="text-red-600"
                >
                  Drop Student
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      size: 200,
      enableSorting: false,
      enableHiding: false,
    }),

    // Chapter columns (dynamic)
    ...chapters.map((chapter) =>
      columnHelper.accessor((row) => row.id, {
        id: `chapter-${chapter.id}`,
        header: () => (
          <div className="max-w-[100px] text-center text-xs font-medium">
            <div className="truncate">{chapter.code}</div>
            <div className="truncate text-gray-600">{chapter.title}</div>
          </div>
        ),
        cell: (info) => {
          const studentId = info.row.original.id;
          const cell = getMatrixCell(studentId, chapter.id);
          const colors = getCellColor(cell.proficiencyLevel, cell.status);

          return (
            <button
              onClick={() => handleCellClick(studentId, chapter.id)}
              disabled={isUpdating}
              className={`
                h-16 w-16 flex items-center justify-center rounded
                border transition-colors cursor-pointer
                ${colors.bgColor} ${colors.textColor} ${colors.borderColor}
                hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50
                font-semibold text-sm
              `}
              title={`${info.row.original.firstName} - ${chapter.code}`}
            >
              {getProficiencyShortLabel(cell.proficiencyLevel)}
            </button>
          );
        },
        size: 100,
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
      {/* Add Student Input Row (Pinned) */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search and add student..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowTypeahead(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowTypeahead(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowTypeahead(false);
                  }
                  // Arrow navigation would go here (for future enhancement)
                }}
                className="pl-9"
                disabled={isAddingStudent}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowTypeahead(false);
                  }}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                  type="button"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear search</span>
                </button>
              )}
            </div>

            {/* Typeahead dropdown - would be populated with eligible students in Phase 3 */}
            {showTypeahead && searchQuery && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                <div className="p-2 text-center text-sm text-gray-500">
                  (Mock: eligible students would appear here)
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={() => {
              if (searchQuery.trim()) {
                // In Phase 3, this would trigger actual enrollment
                toast({ 
                  title: 'In Phase 3: Implement enrollment with selected student',
                  description: 'This is a placeholder for actual enrollment logic'
                });
              }
            }}
            disabled={!searchQuery.trim() || isAddingStudent}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                {headerGroup.headers.map((header) => (
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
                    // eslint-disable-next-line react/no-unknown-property, react/style-prop-object
                    style={{
                      width: header.getSize() === 150 ? undefined : `${header.getSize()}px`,
                    } as any}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3"
                    // eslint-disable-next-line react/no-unknown-property
                    style={{
                      width: cell.column.getSize() === 150 ? undefined : `${cell.column.getSize()}px`,
                    } as any}
                  >
                    {/* Sticky left column */}
                    {cell.column.id === 'student' ? (
                      <div className="sticky left-0 bg-white">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    )}
                  </td>
                ))}
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

      {/* Info text */}
      <div className="text-xs text-gray-500 italic">
        Click any proficiency cell to update. Use kebab menu [⋮] to drop students.
        Track shows chapters from selected track only.
      </div>
    </div>
  );
}
