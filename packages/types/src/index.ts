/**
 * Consolidated TypeScript interfaces and types for the Narada LMS
 */

import {
  type users,
  type tracks,
  type chapters,
  type textSegments,
  type audioFiles
} from "@narada/database/schema";

// Base types from schema
export type User = typeof users.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type TextSegment = typeof textSegments.$inferSelect;
export type AudioFile = typeof audioFiles.$inferSelect;

// Extended types for specific use cases
export interface UserWithRoles extends User {
  roles: string[];
}

export interface TrackWithChapters extends Omit<Track, "createdBy" | "createdAt" | "updatedAt"> {
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

export interface ChapterWithMetadata extends Omit<Chapter, "publishedAt" | "lastEditedBy"> {
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

// Normalized Mapping Types
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

// Learning Progress Types
export interface StudentProgress {
  studentId: string;
  chapterId: number;
  proficiencyLevel: number;
  completionDate?: Date;
  timeSpent: number;
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

// Student Detail Types
export interface StudentDetail {
  id: string; // User ID
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export * from "./zod.js";
export * from "./constants.js";