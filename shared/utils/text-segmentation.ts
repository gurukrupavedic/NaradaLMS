/**
 * Text Segmentation Utilities
 * 
 * Shared utility functions for text segmentation and content handling.
 * 
 * Created: January 2025
 * Purpose: Centralized utilities for text processing and segment management
 */

import type { AudioMapping, Script, ContentMap, TextSegment } from '../types/text-segmentation';

/** Segment shape needed for getSegmentText; accepts API/DB shape (script may be string). */
type SegmentForText = { order: number; startPosition: number; endPosition: number; script: Script | string };

/**
 * Extracts text content for a segment in the specified script
 * @param segment - The text segment to extract content from
 * @param content - The content map containing text for all scripts
 * @param script - The target script to extract
 * @param truncate - Whether to truncate long text (default: false)
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns The extracted text content or segment name as fallback
 */
export const getSegmentText = (
  segment: SegmentForText,
  content: ContentMap,
  script: Script,
  truncate: boolean = false,
  maxLength: number = 50
): string => {
  const text = getDisplayText(content, script);

  if (!text) {
    return `Segment ${segment.order}`;
  }

  const segmentText = text.slice(segment.startPosition, segment.endPosition);

  if (truncate && segmentText.length > maxLength) {
    return segmentText.slice(0, maxLength) + '...';
  }

  return segmentText;
};

/**
 * Legacy function - no longer needed since segments are script-specific
 * @deprecated Use segments directly from API as they are already script-filtered
 */
export const getSegmentsForScript = (
  segments: TextSegment[],
  script: Script
): TextSegment[] => {
  return segments.filter(segment => segment.script === script);
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
  script: Script
): TextSegment[] => {
  return segments.filter(segment => {
    const range = segment.textReferences?.[script];
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
  const { showDecimal = false, showHours = false } = options;

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
 * Converts HTML content to plain text suitable for segmentation
 * @param htmlContent - HTML string content
 * @returns Clean plain text with preserved spacing and line breaks
 */
export const htmlToPlainText = (htmlContent: string): string => {
  if (!htmlContent) return '';

  return htmlContent
    .replace(/<h[1-6][^>]*>/gi, '')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<strong[^>]*>|<\/strong>/gi, '')
    .replace(/<u[^>]*>|<\/u>/gi, '')
    .replace(/<span[^>]*>|<\/span>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim()
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ');
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
export const getDisplayText = (content: ContentMap, script: Script): string => {
  const entry = content[script];

  if (!entry) {
    return '';
  }

  // Handle new structured format
  if (isContentEntryLocal(entry)) {
    return normalizeLineBreaks(entry.display);
  }

  // Handle legacy string format
  if (typeof entry === 'string') {
    return normalizeLineBreaks(htmlToPlainText(entry));
  }

  return '';
};

/**
 * Get segmentation text content for processing
 * @param content - ContentMap containing language content
 * @param language - Target language
 * @returns Normalized segmentation text content for the specified language
 */
export const getSegmentationText = (content: ContentMap, script: Script): string => {
  const entry = content[script];

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
  language?: Script
): boolean => {
  const languagesToCheck = language ? [language] : (['te', 'hi', 'en'] as Script[]);

  return languagesToCheck.some(lang => {
    const range1 = segment1.textReferences?.[lang];
    const range2 = segment2.textReferences?.[lang];

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
  language: Script
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