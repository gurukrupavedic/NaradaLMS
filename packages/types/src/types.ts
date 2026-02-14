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
} from './schema.js';

// Re-export for convenience
export type { User, Track, Chapter, TextSegment, AudioFile };

// Normalized Mapping Types (from schema; used by media pipeline and text-segmentation)
export interface MappingWithTimestamps {
  mappingId: number;
  textSegmentId: number;
  mediaSegmentId: number;
  audioFileId: number;
  startTime: number;
  endTime: number;
  segmentName?: string;
}

// Content Script Types
export type Script = 'te' | 'hi' | 'en';

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