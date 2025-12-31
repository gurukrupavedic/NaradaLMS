/**
 * Unified Batch Matrix Types
 * 
 * Core types for the matrix interface combining enrollment management 
 * and proficiency evaluation for students in a batch, filtered by track.
 */

/**
 * Proficiency level scale: 0-4 for mastery levels, -1 for absent
 * 
 * - 0: Practicing/Attending - Currently learning, minimal competency
 * - 1: 50% - Basic recitation capability, needs practice
 * - 2: 70% - Good flow, minor corrections needed
 * - 3: 90% (Ready) - Ready for certification exam
 * - 4: 95% (Certified) - Mastered and certified
 * - -1: Absent - Student was absent or not evaluated
 */
export type ProficiencyLevel = -1 | 0 | 1 | 2 | 3 | 4;

/**
 * Student row in the matrix
 * Represents a student enrolled in a batch
 */
export interface StudentMatrixRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  enrollmentId: number; // FK to enrollments table for drop operations
}

/**
 * Chapter that appears as a column in the matrix
 * Filtered by the selected track
 */
export interface Chapter {
  id: string;
  code: string;
  title: string;
  trackId: string;
}

/**
 * Student's progress on a specific chapter
 * Links studentId + chapterId to a proficiency level
 */
export interface StudentProgress {
  studentId: string;
  chapterId: string;
  proficiencyLevel: ProficiencyLevel;
  status: 'practicing' | 'completed' | 'absent' | 'not_started';
  lastUpdated: Date;
  evaluatedBy?: string; // Instructor who last evaluated
}

/**
 * Track for UI filtering and chapter grouping
 */
export interface Track {
  id: string;
  name: string;
  code: string;
  description?: string;
  order: number;
}

/**
 * Batch with metadata
 * Includes currentTrackId for context (informational only)
 */
export interface Batch {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  currentTrackId: string; // Informational: what track is batch currently teaching
  instructorIds: string[];
  enrollmentCount: number;
}

/**
 * Props for the UnifiedBatchMatrix component
 * All data passed as props (no internal fetching)
 */
export interface UnifiedBatchMatrixProps {
  // Data
  students: StudentMatrixRow[];
  chapters: Chapter[];
  progress: StudentProgress[];

  // Context (for display/filtering)
  selectedBatchId: string;
  selectedTrackId: string;

  // Callbacks
  onDropStudent: (enrollmentId: number) => Promise<void>;
  onUpdateProficiency: (
    studentId: string,
    chapterId: string,
    level: ProficiencyLevel
  ) => Promise<void>;

  // Loading states
  isLoading?: boolean;
  isUpdating?: boolean;
}

/**
 * Eligible student for typeahead dropdown (matches API response)
 */
export interface EligibleStudent {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  roles: string[];
}

/**
 * Props for the MatrixEvaluationModal component
 */
export interface MatrixEvaluationModalProps {
  isOpen: boolean;
  student?: StudentMatrixRow;
  chapter?: Chapter;
  currentProficiency?: ProficiencyLevel;
  onClose: () => void;
  onUpdate: (level: ProficiencyLevel) => Promise<void>;
  isUpdating?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

/**
 * Cell data for rendering in matrix
 * Combines student, chapter, and progress information
 */
export interface MatrixCell {
  studentId: string;
  chapterId: string;
  proficiencyLevel: ProficiencyLevel;
  status: 'practicing' | 'completed' | 'absent' | 'not_started';
  isEmpty: boolean; // true if no progress record exists
}
