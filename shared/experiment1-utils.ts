/**
 * EXPERIMENT 1: Centralized Utility Functions
 * 
 * This file contains shared utility functions used across Experiment 1 components.
 * These utilities are isolated from production code and can be safely modified
 * or removed when the experiment concludes.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Eliminate duplicate utility functions across experiment components
 */

import type { TextSegment, AudioMapping, Language, ContentMap } from './experiment1-types';
import { isContentEntry } from './experiment1-types';

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
  const { getDisplayText } = require('./utils/text-segmentation');
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
 * @returns Filtered segments with text references for the language
 */
export const filterSegmentsByLanguage = (
  segments: TextSegment[],
  language: Language
): TextSegment[] => {
  return segments
    .filter(segment => segment.textReferences[language])
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

/**
 * Finds the audio mapping for a given segment
 * @param segmentId - The ID of the segment to find mapping for
 * @param mappings - Array of audio mappings to search
 * @returns The audio mapping if found, undefined otherwise
 */
export const getSegmentMapping = (
  segmentId: string,
  mappings: AudioMapping[]
): AudioMapping | undefined => {
  return mappings.find(mapping => mapping.segmentId === segmentId);
};

/**
 * Gets the language display label
 * @param language - The language code
 * @returns Human-readable language label
 */
export const getLanguageLabel = (language: Language): string => {
  switch (language) {
    case 'te': return 'Telugu';
    case 'hi': return 'Hindi';
    case 'en': return 'English';
    default: return language;
  }
};

/**
 * Formats time with configurable precision and padding
 * @param seconds - Time in seconds
 * @param options - Formatting options
 * @returns Formatted time string
 */
export const formatTime = (seconds: number, options: {
  showDecimal?: boolean;
  showHours?: boolean;
  padMinutes?: boolean;
} = {}): string => {
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

// getDisplayText and getSegmentationText functions removed - using single implementation from shared/utils/text-segmentation.ts