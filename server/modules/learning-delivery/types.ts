/**
 * Learning Delivery Module - Type Definitions
 * Student-facing content consumption and progress tracking
 */

import type { ProficiencyLevel } from '@narada/types';
import type { Chapter, TextSegment } from '../content-publishing/types';
import type { AudioFile, MappingWithTimestamps } from '../media-pipeline/types';

// DTOs for student progress queries
export interface StudentProgressDTO {
  id: number;
  studentId: string;
  chapterId: number;
  batchId: number | null;
  proficiencyLevel: ProficiencyLevel | null;
  lastAccessed: Date | null;
  lastEvaluatedAt: Date | null;
  evaluatedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  chapterTitle?: string;
  trackName?: string;
  batchName?: string;
}

// DTO for chapter access (learning content delivery)
export interface ChapterAccessDTO {
  chapterId: number;
  studentId: string;
  batchId?: number;
}

// Available chapters for a student (based on enrollments)
export interface AvailableChapterDTO {
  chapterId: number;
  chapterTitle: string;
  chapterNumber: number;
  trackId: number;
  trackName: string;
  batchId: number;
  batchName: string;
  status: 'draft' | 'published';
  // Student's progress for this chapter (if exists)
  progress?: StudentProgressDTO;
}

// Query filters for student progress
export interface ProgressQueryFilters {
  studentId?: string;
  trackId?: number;
  chapterId?: number;
  batchId?: number;
}

// -------- Chapter Facade DTOs --------

export type ChapterInclude = 'chapter' | 'segments' | 'audio' | 'mappings' | 'progress';

export interface ChapterBundleDTO {
  chapter?: Chapter | null;
  textSegments?: TextSegment[];
  audioFiles?: AudioFile[];
  segmentMappings?: MappingWithTimestamps[];
  progress?: StudentProgressDTO | null;
}

export interface ChapterBundleQuery {
  include?: ChapterInclude[]; // defaults applied at service-layer
  script?: 'te' | 'hi' | 'en';
}
