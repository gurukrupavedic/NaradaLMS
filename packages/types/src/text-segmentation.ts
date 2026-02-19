/**
 * Text Segmentation Type Definitions
 * 
 * TypeScript interfaces and types for text segmentation system components.
 * Uses normalized mapping system (mediaSegments + segmentMappings).
 * 
 * Created: January 2025
 * Updated: December 2025 - Migrated to normalized mapping system
 */

// Re-export or extend base types to avoid conflicts
import type { TextSegment as BaseTextSegment, AudioFile as BaseAudioFile, Chapter as BaseChapter, Script, MappingWithTimestamps } from './types.js';

export interface EnrichedTextSegment extends BaseTextSegment {
  textReferences?: Record<Script, { start: number; end: number }>;
  conceptualName?: string;
}

// MediaSegment, SegmentMapping, MappingWithTimestamps are already exported by ./types
// and re-exported by index.ts, so we don't need to export them here.

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
// MappingWithTimestamps imported above
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

// AudioFile and Chapter are already in types.ts (schema based)
// But text-segmentation used specific interfaces.
// If the structural shape is compatible, we use types.ts.
// If not, we define specific ones.
// Checking compatibility:
// types.ts Chapter: DB row.
// local Chapter: content { te, hi, en }
// If DB row 'content' is jsonb matching this, we are good.
// But to be safe, let's just not export 'Chapter' again or rename it.

export interface SegmentChapter {
  id: number;
  trackId: number;
  title: string;
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
}

// Script is in types.ts so we don't need to re-export it.
// script types are used locally though.

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
