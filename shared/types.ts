/**
 * Consolidated TypeScript interfaces and types for the Vedic LMS
 * Single source of truth for all data structures across frontend and backend
 */

import { type users, type tracks, type chapters, type textSegments, type audioFiles } from './schema';

// Base types from schema
export type User = typeof users.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type TextSegment = typeof textSegments.$inferSelect;
export type AudioFile = typeof audioFiles.$inferSelect;

// Extended types for specific use cases
export interface UserWithRoles extends User {
  roles: string[];
  lastLoginAt?: Date;
}

export interface TrackWithChapters extends Track {
  chapters: Chapter[];
  chapterCount: number;
  lastModified?: string;
}

export interface ChapterWithProgress extends Chapter {
  progressPercentage?: number;
  isCompleted?: boolean;
  proficiencyLevel?: number;
  audioFiles?: AudioFile[];
}

export interface ChapterWithMetadata extends Chapter {
  trackId: number;
  textReferences: {
    te?: string[];
    hi?: string[];
    en?: string[];
  };
  estimatedDuration?: number;
  lastEditedBy?: string;
  publishedAt?: string;
}

// Normalized Mapping Types (new system)
export interface MediaSegment {
  id: number;
  audioFileId: number;
  startTimestamp: number;
  endTimestamp: number;
  segmentName?: string;
  createdBy?: string;
  createdAt?: Date;
}

export interface SegmentMapping {
  id: number;
  mediaSegmentId: number;
  textSegmentId: number;
  createdBy?: string;
  createdAt?: Date;
}

export interface MappingWithTimestamps {
  mappingId: number;
  textSegmentId: number;
  mediaSegmentId: number;
  audioFileId: number;
  startTime: number;
  endTime: number;
  segmentName?: string;
}

// Learning Progress Types
export interface StudentProgress {
  studentId: string;
  chapterId: number;
  proficiencyLevel: number;
  completionDate?: Date;
  timeSpent: number;
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
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

export interface ApiSuccessResponse<T = any> {
  data: T;
  message?: string;
  timestamp: string;
}