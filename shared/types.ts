/**
 * Production Type Definitions
 * 
 * Consolidated TypeScript interfaces for production components
 * Migrated from experimental types and standardized
 * 
 * Status: Production Ready
 * Created: January 2025
 */

export interface TextSegment {
  id: string;
  conceptualName: string;
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

export interface ContentMap {
  te?: string;
  hi?: string;
  en?: string;
}

export interface TextRange {
  start: number;
  end: number;
  text: string;
}

export interface SegmentReference {
  start: number;
  end: number;
}