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

export type Language = 'te' | 'hi' | 'en';

export interface ContentMap {
  te?: string;
  hi?: string;
  en?: string;
}

export interface TextRange {
  start: number;
  end: number;
}