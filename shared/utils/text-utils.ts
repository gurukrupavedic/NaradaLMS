/**
 * Text Utilities for Segmentation and Mapping
 * 
 * Centralized utility functions for text processing, segment extraction,
 * and language-specific operations in the text segmentation system.
 * 
 * Created: January 2025
 * Purpose: Eliminate duplicate utility functions across text components
 */

import type { TextSegment, AudioMapping, Language, ContentMap } from '@shared/types/text-segmentation';
import { isContentEntry } from '@shared/types/text-segmentation';

/**
 * Extracts text content for a segment in the specified language
 * @param segment - The text segment to extract content from
 * @param content - The content map containing text for all languages
 * @param language - The target language to extract
 * @param truncate - Whether to truncate long text (default: false)
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns The extracted text content or segment name as fallback
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
 * @param segments - Array of text segments to filter
 * @param language - The language to filter by
 * @returns Array of segments that have text references for the language
 */
export const filterSegmentsByLanguage = (
  segments: TextSegment[],
  language: Language
): TextSegment[] => {
  return segments.filter(segment => {
    const range = segment.textReferences[language];
    return range && range.start !== undefined && range.end !== undefined;
  });
};

/**
 * Extracts display text from content map for a specific language
 * @param content - The content map containing text for all languages
 * @param language - The target language
 * @returns The text content for the specified language or empty string
 */
export const getDisplayText = (content: ContentMap, language: Language): string => {
  const languageContent = content[language];
  
  if (!languageContent) {
    return '';
  }
  
  if (typeof languageContent === 'string') {
    return languageContent;
  }
  
  if (isContentEntry(languageContent)) {
    return languageContent.content || '';
  }
  
  return '';
};

/**
 * Finds all audio mappings for a specific text segment
 * @param mappings - Array of audio mappings to search
 * @param segmentId - The segment ID to find mappings for
 * @returns Array of audio mappings for the segment
 */
export const getMappingsForSegment = (
  mappings: AudioMapping[],
  segmentId: string
): AudioMapping[] => {
  return mappings.filter(mapping => mapping.segmentId === segmentId);
};

/**
 * Calculates the total mapped duration for a text segment
 * @param mappings - Array of audio mappings for the segment
 * @returns Total duration in seconds
 */
export const getTotalMappedDuration = (mappings: AudioMapping[]): number => {
  return mappings.reduce((total, mapping) => {
    return total + (mapping.endTime - mapping.startTime);
  }, 0);
};

/**
 * Sorts text segments by their position in the text for a given language
 * @param segments - Array of text segments to sort
 * @param language - The language to sort by
 * @returns Sorted array of segments
 */
export const sortSegmentsByPosition = (
  segments: TextSegment[],
  language: Language
): TextSegment[] => {
  return [...segments].sort((a, b) => {
    const rangeA = a.textReferences[language];
    const rangeB = b.textReferences[language];
    
    if (!rangeA && !rangeB) return 0;
    if (!rangeA) return 1;
    if (!rangeB) return -1;
    
    return rangeA.start - rangeB.start;
  });
};

/**
 * Validates if a text range is valid within the given text
 * @param text - The full text content
 * @param start - Start position of the range
 * @param end - End position of the range
 * @returns True if the range is valid
 */
export const isValidTextRange = (text: string, start: number, end: number): boolean => {
  return start >= 0 && end >= start && end <= text.length;
};

/**
 * Generates a unique segment ID
 * @param prefix - Optional prefix for the ID (default: 'seg')
 * @returns Unique segment identifier
 */
export const generateSegmentId = (prefix: string = 'seg'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Formats time in seconds to MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Checks if two text segments overlap in a given language
 * @param segmentA - First text segment
 * @param segmentB - Second text segment
 * @param language - The language to check overlap for
 * @returns True if segments overlap
 */
export const doSegmentsOverlap = (
  segmentA: TextSegment,
  segmentB: TextSegment,
  language: Language
): boolean => {
  const rangeA = segmentA.textReferences[language];
  const rangeB = segmentB.textReferences[language];
  
  if (!rangeA || !rangeB) return false;
  
  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
};

/**
 * Extracts text content within a specific range
 * @param text - The full text content
 * @param start - Start position
 * @param end - End position
 * @returns Extracted text or empty string if invalid range
 */
export const extractTextRange = (text: string, start: number, end: number): string => {
  if (!isValidTextRange(text, start, end)) {
    return '';
  }
  return text.slice(start, end);
};