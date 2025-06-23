/**
 * Text Segmentation Utilities
 * 
 * Shared utility functions for text segmentation and content handling.
 * 
 * Created: January 2025
 * Purpose: Centralized utilities for text processing and segment management
 */

import type { TextSegment, AudioMapping, Language, ContentMap } from '../types/text-segmentation';
import { isContentEntry } from '../types/text-segmentation';
import { extractPlainText } from '../../client/src/lib/html-utils';

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
 * @param language - Target language to filter by
 * @returns Array of segments that have references in the specified language
 */
export const getSegmentsForLanguage = (
  segments: TextSegment[],
  language: Language
): TextSegment[] => {
  return segments.filter(segment => segment.textReferences[language]);
};

/**
 * Finds all segments that contain a given text position
 * @param segments - Array of text segments to search
 * @param position - Text position to search for
 * @param language - Language to check references in
 * @returns Array of segments containing the position
 */
export const getSegmentsAtPosition = (
  segments: TextSegment[],
  position: number,
  language: Language
): TextSegment[] => {
  return segments.filter(segment => {
    const range = segment.textReferences[language];
    return range && position >= range.start && position <= range.end;
  });
};

/**
 * Formats duration in seconds to readable time string
 * @param seconds - Duration in seconds
 * @param options - Formatting options
 * @returns Formatted time string (e.g., "1:23", "0:05.2", "1:02:30")
 */
export const formatDuration = (
  seconds: number, 
  options: {
    showDecimal?: boolean;
    showHours?: boolean; 
    padMinutes?: boolean;
  } = {}
): string => {
  const { showDecimal = false, showHours = false, padMinutes = true } = options;
  
  const totalSeconds = Math.max(0, seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secsValue = totalSeconds % 60;
  
  if (showHours || hours > 0) {
    const paddedMins = mins.toString().padStart(2, '0');
    const secsStr = showDecimal 
      ? secsValue.toFixed(1)
      : Math.floor(secsValue).toString();
    const paddedSecs = secsStr.padStart(showDecimal ? 4 : 2, '0');
    return `${hours}:${paddedMins}:${paddedSecs}`;
  }
  
  const formattedMins = mins.toString();
  const secsStr = showDecimal 
    ? secsValue.toFixed(1) 
    : Math.floor(secsValue).toString();
  const paddedSecs = secsStr.padStart(showDecimal ? 4 : 2, '0');
  return `${formattedMins}:${paddedSecs}`;
};

/**
 * Normalize line breaks for consistent text matching between selection and storage
 * @param text - Text to normalize
 * @returns Text with consistent line break characters only
 */
export const normalizeLineBreaks = (text: string): string => {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

/**
 * Helper type guard for content entries
 */
const isContentEntryLocal = (content: any): content is { display: string; segmentation: string } => {
  return typeof content === 'object' && content !== null && 'display' in content && 'segmentation' in content;
};

/**
 * Get text content with normalization and backward compatibility
 * @param content - ContentMap containing language content
 * @param language - Target language
 * @returns Normalized text content for the specified language
 */
export const getDisplayText = (content: ContentMap, language: Language): string => {
  const entry = content[language];
  
  if (!entry) {
    return '';
  }
  
  // Handle new structured format
  if (isContentEntryLocal(entry)) {
    return normalizeLineBreaks(extractPlainText(entry.display));
  }
  
  // Handle legacy string format - convert HTML to plain text
  if (typeof entry === 'string') {
    return normalizeLineBreaks(extractPlainText(entry));
  }
  
  return '';
};

/**
 * Get segmentation text content for processing
 * @param content - ContentMap containing language content
 * @param language - Target language
 * @returns Normalized segmentation text content for the specified language
 */
export const getSegmentationText = (content: ContentMap, language: Language): string => {
  const entry = content[language];
  
  if (!entry) {
    return '';
  }
  
  // Handle new structured format
  if (isContentEntryLocal(entry)) {
    return normalizeLineBreaks(entry.segmentation);
  }
  
  // Handle legacy string format - use display text as fallback
  if (typeof entry === 'string') {
    return normalizeLineBreaks(entry);
  }
  
  return '';
};

/**
 * Checks if a segment overlaps with another segment in any language
 * @param segment1 - First segment to compare
 * @param segment2 - Second segment to compare
 * @param language - Language to check overlaps in (optional, checks all if not specified)
 * @returns True if segments overlap in the specified language or any language
 */
export const segmentsOverlap = (
  segment1: TextSegment,
  segment2: TextSegment,
  language?: Language
): boolean => {
  const languagesToCheck = language ? [language] : (['te', 'hi', 'en'] as Language[]);
  
  return languagesToCheck.some(lang => {
    const range1 = segment1.textReferences[lang];
    const range2 = segment2.textReferences[lang];
    
    if (!range1 || !range2) return false;
    
    return !(range1.end <= range2.start || range2.end <= range1.start);
  });
};

/**
 * Validates that a text range is valid within the given content
 * @param range - Text range to validate
 * @param content - Content map to validate against
 * @param language - Language to validate in
 * @returns True if range is valid
 */
export const isValidTextRange = (
  range: { start: number; end: number },
  content: ContentMap,
  language: Language
): boolean => {
  const text = getDisplayText(content, language);
  return range.start >= 0 && 
         range.end <= text.length && 
         range.start <= range.end;
};

/**
 * Gets the audio mappings for a specific segment
 * @param segment - Text segment to get mappings for
 * @param mappings - Array of all audio mappings
 * @returns Array of audio mappings for the segment
 */
export const getMappingsForSegment = (
  segment: TextSegment,
  mappings: AudioMapping[]
): AudioMapping[] => {
  return mappings.filter(mapping => mapping.segmentId === segment.id);
};

/**
 * Calculates total mapped duration for a segment across all audio files
 * @param segment - Text segment to calculate for
 * @param mappings - Array of all audio mappings
 * @returns Total duration in seconds
 */
export const getTotalMappedDuration = (
  segment: TextSegment,
  mappings: AudioMapping[]
): number => {
  const segmentMappings = getMappingsForSegment(segment, mappings);
  return segmentMappings.reduce((total, mapping) => {
    return total + (mapping.endTime - mapping.startTime);
  }, 0);
};