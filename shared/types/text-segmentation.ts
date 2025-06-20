/**
 * Text Segmentation Type Definitions
 * 
 * TypeScript interfaces and types for the text segmentation and audio mapping system.
 * Provides type safety for text segments, audio mappings, and related data structures.
 * 
 * Created: January 2025
 * Purpose: Consolidate type definitions for text segmentation functionality
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

// Content entry structure for rich text content
export interface ContentEntry {
  content: string;
  lastUpdated?: string;
  metadata?: {
    wordCount?: number;
    characterCount?: number;
    language?: Language;
  };
}

// Content map type supporting both string and structured content
export type ContentMap = {
  [K in Language]?: string | ContentEntry;
};

// Type guard function for ContentEntry
export const isContentEntry = (value: any): value is ContentEntry => {
  return value && typeof value === 'object' && typeof value.content === 'string';
};

// Language display names
export const LANGUAGE_NAMES: Record<Language, string> = {
  te: 'తెలుగు (Telugu)',
  hi: 'देवनागरी (Hindi)',
  en: 'English/IAST'
};

// Text range interface for more complex text operations
export interface TextRange {
  start: number;
  end: number;
  text?: string;
  language: Language;
}

// Extended text segment for more complex operations
export interface ExtendedTextSegment extends TextSegment {
  description?: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  audioMappings?: AudioMapping[];
}

// Audio segment data structure
export interface AudioSegment {
  id: string;
  startTime: number;
  endTime: number;
  label?: string;
  audioFileId: number;
}

// Mapping between text and audio segments
export interface SegmentMapping {
  id: string;
  textSegmentId: string;
  audioSegmentId: string;
  confidence?: number;
  verified?: boolean;
  notes?: string;
}

// Progress tracking for segmentation work
export interface SegmentationProgress {
  totalSegments: number;
  mappedSegments: number;
  verifiedMappings: number;
  completionPercentage: number;
}

// Export all types for convenience
export type {
  TextSegment as Segment,
  AudioMapping as Mapping,
  AudioFile as Audio,
  Chapter as ChapterData,
  Language as Lang
};