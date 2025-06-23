/**
 * Text Segmentation Type Definitions
 * 
 * TypeScript interfaces and types for text segmentation system components.
 * Provides type safety for text segments, audio mappings, and language operations.
 * 
 * Created: January 2025
 * Purpose: Consolidate interfaces for text segmentation functionality
 */

export interface TextSegment {
  id: number;
  conceptualName?: string; // Optional legacy field, text content serves as identifier
  textReferences: {
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  };
  order: number;
}

export interface AudioMapping {
  segmentId: string;
  startTime: number;
  endTime: number;
}

// Database-compatible interface for backend operations
export interface AudioMappingDatabase {
  id?: number;
  segmentId: number;        // Database format (integer)
  audioFileId: number;
  startTime: number;
  endTime: number;
  createdBy?: string;
  createdAt?: string;
}

// Conversion utilities for type compatibility
export const convertDatabaseMapping = (db: AudioMappingDatabase): AudioMapping => ({
  segmentId: db.segmentId.toString(),
  startTime: db.startTime,
  endTime: db.endTime
});

export const convertToDatabase = (mapping: AudioMapping, audioFileId: number): Omit<AudioMappingDatabase, 'id' | 'createdBy' | 'createdAt'> => ({
  segmentId: parseInt(mapping.segmentId),
  audioFileId,
  startTime: mapping.startTime,
  endTime: mapping.endTime
});

export interface AudioFile {
  id: number;
  filename: string;
  displayName?: string;
  chapterId: number;
}

export interface Chapter {
  id: number;
  trackId: number;
  title: string;
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
}

export type Language = 'te' | 'hi' | 'en';

// New content entry structure
export interface ContentEntry {
  display: string;
  segmentation: string;
}

// Updated ContentMap with backward compatibility
export interface ContentMap {
  te?: ContentEntry | string;  // Support both old and new format
  hi?: ContentEntry | string;
  en?: ContentEntry | string;
}

export interface TextRange {
  start: number;
  end: number;
}

// Type guard to check if content is ContentEntry format
export function isContentEntry(content: ContentEntry | string | undefined): content is ContentEntry {
  return typeof content === 'object' && content !== null && 'display' in content;
}