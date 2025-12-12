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
  mappingId: number;
  textSegmentId: number;
  mediaSegmentId: number;
  audioFileId: number;
  startTime: number;
  endTime: number;
  segmentName?: string;
}

export interface AudioMapping {
  segmentId: number;
  startTime: number;
  endTime: number;
}

export type AudioMappingDatabase = MappingWithTimestamps;

export const convertDatabaseMapping = (db: MappingWithTimestamps): AudioMapping => ({
  segmentId: db.textSegmentId,
  startTime: db.startTime,
  endTime: db.endTime
});

export const convertToDatabase = (mapping: AudioMapping, audioFileId: number): {
  audioFileId: number;
  textSegmentId: number;
  startTime: number;
  endTime: number;
} => ({
  textSegmentId: mapping.segmentId,
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
