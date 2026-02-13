/**
 * Consolidated TypeScript interfaces and types for the Vedic LMS
 * Single source of truth for all data structures across frontend and backend
 */

// Import base types from schema (single source of truth)
// MediaSegment, SegmentMapping, StudentProgress are exported only from schema to avoid index collision
import type {
  User,
  Track,
  Chapter,
  TextSegment,
  AudioFile,
} from './schema';

// Re-export for convenience
export type { User, Track, Chapter, TextSegment, AudioFile };

// Extended types for specific use cases
export interface UserWithRoles extends User {
  roles: string[];
  // lastLoginAt inherited from User (Date | null, non-optional)
}

export interface TrackWithChapters extends Omit<Track, 'createdBy' | 'createdAt' | 'updatedAt'> {
  chapters: Chapter[];
  chapterCount: number;
  lastModified?: string;
  createdBy?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface ChapterWithProgress extends Chapter {
  progressPercentage?: number;
  isCompleted?: boolean;
  proficiencyLevel?: number;
  audioFiles?: AudioFile[];
}

export interface ChapterWithMetadata extends Omit<Chapter, 'publishedAt' | 'lastEditedBy'> {
  trackId: number;
  textReferences: {
    te?: string[];
    hi?: string[];
    en?: string[];
  };
  estimatedDuration?: number;
  lastEditedBy?: string | null;
  publishedAt?: Date | null;
}

// Normalized Mapping Types (from schema; MappingWithTimestamps for API layer)
export interface MappingWithTimestamps {
  mappingId: number;
  textSegmentId: number;
  mediaSegmentId: number;
  audioFileId: number;
  startTime: number;
  endTime: number;
  segmentName?: string;
}

export interface StudentStats {
  totalChapters: number;
  completedChapters: number;
  averageProficiency: number;
  progressPercentage: number;
  currentStreak?: number;
  highestLevel?: number;
}

// UI Component Props
export interface DashboardProps {
  onTrackSelect: (trackId: number) => void;
  onChapterSelect: (chapterId: number) => void;
}

export interface TrackCardProps {
  track: TrackWithChapters;
  onClick?: () => void;
  showProgress?: boolean;
}

// Content Script Types
export type Script = 'te' | 'hi' | 'en';

export interface MultiScriptContent {
  te?: string;
  hi?: string;
  en?: string;
}

// Form and API Types
export interface CreateTrackRequest {
  title: string;
  description: string;
  order?: number;
  estimatedHours?: number;
}

export interface CreateChapterRequest {
  trackId: number;
  title: string;
  content: MultiScriptContent;
  order?: number;
}

export interface UpdateChapterRequest {
  title?: string;
  content?: MultiScriptContent;
  status?: 'draft' | 'published';
}

// Error and Response Types
export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  };
}

export interface ApiSuccessResponse<T = any> {
  data: T;
  message?: string;
  timestamp: string;
}

// My Students / Instructor Student List Type
export interface MyStudent {
  id: string; // User ID
  rollNumber: string; // Format: BATCH_CODE-XXX
  name: string;
  email: string;
  phone: string;
  timezone: string;
  type: string; // 'bramhachari' | 'grihasta' or '-' if null
  batchCode: string;
  batchName: string;
  enrolledAt: Date | string | null;
}

export interface GetMyStudentsResponse {
  items: MyStudent[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// Student Details / Proficiency Types
export interface ProficiencyRecord {
  chapterId: number;
  chapterTitle: string;
  chapterNumber: number;
  proficiencyLevel: number | null; // 0-4 scale or null if not evaluated
  lastAccessed: Date | null;
  lastEvaluatedAt: Date | null;
  evaluatedBy: string | null;
  notes: string | null;
}

export interface StudentEnrollment {
  enrollmentId: number;
  batchId: number;
  batchCode: string;
  batchName: string;
  trackId: number;
  trackName: string;
  enrolledAt: Date | string | null;
  status: 'active' | 'dropped' | 'completed';
}

export interface StudentDetail {
  id: string; // User ID
  firstName: string | null;
  lastName: string | null;
  email: string;
  enrollment: StudentEnrollment | null;
  proficiencyMatrix: ProficiencyRecord[];
}

export interface GetStudentDetailsResponse {
  data: StudentDetail;
  timestamp: string;
}

// Student Track Progress Types (Phase D: Track-wise Progress Visualization)
export interface ChapterProgress {
  chapterId: number;
  chapterOrder: number;
  chapterTitle: string;
  chapterCode: string;
  proficiencyLevel: number | null; // 0-4, 8 (absent), 9 (not started), or null
  lastEvaluatedAt: string | null; // ISO Date string
  evaluatedBy: string | null;
  notes: string | null;
}

export interface TrackProgress {
  trackId: number;
  trackOrder: number;
  trackTitle: string;
  trackDescription: string;
  completedChapters: number;
  totalChapters: number;
  chapters: ChapterProgress[];
}

export interface StudentProgressData {
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  trackProgress: TrackProgress[];
}