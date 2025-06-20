/**
 * Production Utility Functions
 * 
 * Shared utility functions for production components
 * Migrated from experimental utilities and standardized
 * 
 * Status: Production Ready
 * Created: January 2025
 */

import type { TextSegment, AudioMapping, Language, ContentMap } from './types';

/**
 * Extracts text content for a segment in the specified language
 */
export const getSegmentText = (
  segment: TextSegment,
  content: ContentMap,
  language: Language,
  truncate: boolean = false,
  maxLength: number = 50
): string => {
  const range = segment.textReferences[language];
  const text = getDisplayText(content, language);
  
  if (!range || !text) {
    return segment.conceptualName;
  }
  
  const segmentText = text.slice(range.start, range.end);
  
  if (truncate && segmentText.length > maxLength) {
    return segmentText.slice(0, maxLength) + '...';
  }
  
  return segmentText;
};

/**
 * Filters segments that have text references for the specified language
 */
export const filterSegmentsByLanguage = (
  segments: TextSegment[],
  language: Language
): TextSegment[] => {
  return segments.filter(segment => segment.textReferences[language]);
};

/**
 * Gets the display text for a language from content map
 */
export const getDisplayText = (content: ContentMap, language: Language): string => {
  return content[language] || '';
};

/**
 * Gets the segmentation text (same as display text for now)
 */
export const getSegmentationText = (content: ContentMap, language: Language): string => {
  return getDisplayText(content, language);
};

/**
 * Gets human-readable language label
 */
export const getLanguageLabel = (language: Language): string => {
  const labels = {
    te: 'Telugu',
    hi: 'Hindi',
    en: 'English'
  };
  return labels[language];
};

/**
 * Normalizes line breaks for consistent text processing
 */
export const normalizeLineBreaks = (text: string): string => {
  return text.replace(/\r\n|\r/g, '\n');
};

/**
 * Formats time in MM:SS format
 */
export const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0 || !isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

/**
 * Checks if content is HTML-based
 */
export const isHtmlContent = (text: string): boolean => {
  return /<[a-z][\s\S]*>/i.test(text);
};