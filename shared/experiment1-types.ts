/**
 * EXPERIMENT 1: Centralized Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used exclusively
 * within Experiment 1 components. These types are isolated from production
 * code and can be safely modified or removed when the experiment concludes.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Consolidate duplicate interfaces across experiment components
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

export type Script = 'te' | 'hi' | 'en';

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

// Helper type guard
export const isContentEntry = (content: ContentEntry | string | undefined): content is ContentEntry => {
  return typeof content === 'object' && content !== null && 'display' in content && 'segmentation' in content;
};

export interface TextRange {
  start: number;
  end: number;
}