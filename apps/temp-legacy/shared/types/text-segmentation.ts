/**
 * Text Segmentation Type Definitions
 * 
 * TypeScript interfaces and types for text segmentation system components.
 * Uses normalized mapping system (mediaSegments + segmentMappings).
 * 
 * Created: January 2025
 * Updated: December 2025 - Migrated to normalized mapping system
 */

export interface TextSegment {
  id: number;
  chapterId: number;
  script: Script;
  startPosition: number;
  endPosition: number;
  order: number;
  createdBy: string;
  createdAt: string;
  textReferences?: Record<Script, { start: number; end: number }>;
  conceptualName?: string;
}

export interface MediaSegment {
  id: number;
  audioFileId: number;
  startTimestamp: number;
  endTimestamp: number;
  segmentName?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface SegmentMapping {
  id: number;
  mediaSegmentId: number;
  textSegmentId: number;
  createdBy?: string;
  createdAt?: string;
}

export interface MappingWithTimestamps {
  mappingId?: number;
  textSegmentId: number;
  mediaSegmentId: number;
  audioFileId: number;
  startTime: number;
  endTime: number;
  segmentName?: string;
}

/**
 * Simplified mapping interface for frontend components.
 * Use this for UI display and playback control.
 */
export interface SimplifiedMapping {
  segmentId: number;
  startTime: number;
  endTime: number;
  textSegmentId?: number;
  mediaSegmentId?: number;
  audioFileId?: number;
  mappingId?: number;
}

/**
 * @deprecated Use MappingWithTimestamps directly instead
 */
export type AudioMappingDatabase = MappingWithTimestamps;

/**
 * @deprecated Use SimplifiedMapping instead
 */
export type AudioMapping = SimplifiedMapping;

/**
 * Convert database mapping to simplified frontend format
 */
export const toSimplifiedMapping = (db: MappingWithTimestamps): SimplifiedMapping => ({
  segmentId: db.textSegmentId,
  startTime: db.startTime,
  endTime: db.endTime
});

/**
 * @deprecated Use toSimplifiedMapping instead
 */
export const convertDatabaseMapping = toSimplifiedMapping;

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

export type Script = 'te' | 'hi' | 'en';

export interface ContentEntry {
  display: string;
  segmentation: string;
}

export interface ContentMap {
  te?: ContentEntry | string;
  hi?: ContentEntry | string;
  en?: ContentEntry | string;
}

export interface TextRange {
  start: number;
  end: number;
}

export function isContentEntry(content: ContentEntry | string | undefined): content is ContentEntry {
  return typeof content === 'object' && content !== null && 'display' in content;
}
