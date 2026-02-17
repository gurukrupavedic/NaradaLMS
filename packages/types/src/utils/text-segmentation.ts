/**
 * Text Segmentation Utilities
 * Shared by student-portal and ops-portal.
 */

import type { Script } from "../types.js";

export const ELLIPSIS = "…";
import type {
  EnrichedTextSegment,
  AudioMapping,
  ContentMap,
} from "../text-segmentation.js";

type TextSegment = EnrichedTextSegment;

/** Minimal segment shape for getSegmentText (API returns createdAt as string). */
export interface SegmentForDisplay {
  id: number;
  order: number;
  startPosition: number;
  endPosition: number;
  script?: string;
  createdAt?: string | Date | null;
}

/**
 * Extracts text content for a segment in the specified script
 */
export const getSegmentText = (
  segment: SegmentForDisplay,
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
    return segmentText.slice(0, maxLength) + ELLIPSIS;
  }
  return segmentText;
};

/**
 * Finds all segments that contain a given text position
 */
export const getSegmentsAtPosition = (
  segments: TextSegment[],
  position: number,
  script: Script
): TextSegment[] => {
  return segments.filter((segment) => {
    const range = segment.textReferences?.[script];
    return range && position >= range.start && position <= range.end;
  });
};

/**
 * Formats duration in seconds to readable time string
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
    const paddedMins = mins.toString().padStart(2, "0");
    const secsStr = showDecimal
      ? secsValue.toFixed(1)
      : Math.floor(secsValue).toString();
    const paddedSecs = secsStr.padStart(showDecimal ? 4 : 2, "0");
    return `${hours}:${paddedMins}:${paddedSecs}`;
  }

  const formattedMins = mins.toString();
  const secsStr = showDecimal
    ? secsValue.toFixed(1)
    : Math.floor(secsValue).toString();
  const paddedSecs = secsStr.padStart(showDecimal ? 4 : 2, "0");
  return `${formattedMins}:${paddedSecs}`;
};

/**
 * Normalize line breaks for consistent text matching between selection and storage
 */
export const normalizeLineBreaks = (text: string): string => {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
};

/**
 * Converts HTML content to plain text suitable for segmentation
 */
export const htmlToPlainText = (htmlContent: string): string => {
  if (!htmlContent) return "";
  return htmlContent
    .replace(/<h[1-6][^>]*>/gi, "")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<strong[^>]*>|<\/strong>/gi, "")
    .replace(/<u[^>]*>|<\/u>/gi, "")
    .replace(/<span[^>]*>|<\/span>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim()
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .replace(/[ \t]+/g, " ");
};

const isContentEntryLocal = (
  content: unknown
): content is { display: string; segmentation: string } => {
  return (
    typeof content === "object" &&
    content !== null &&
    "display" in (content as object) &&
    "segmentation" in (content as object)
  );
};

/**
 * Get text content with normalization and backward compatibility
 */
export const getDisplayText = (content: ContentMap, script: Script): string => {
  const entry = content[script];
  if (!entry) {
    return "";
  }
  if (isContentEntryLocal(entry)) {
    return normalizeLineBreaks(entry.display);
  }
  if (typeof entry === "string") {
    return normalizeLineBreaks(htmlToPlainText(entry));
  }
  return "";
};

/**
 * Get segmentation text content for processing
 */
export const getSegmentationText = (
  content: ContentMap,
  script: Script
): string => {
  const entry = content[script];
  if (!entry) {
    return "";
  }
  if (isContentEntryLocal(entry)) {
    return normalizeLineBreaks(entry.segmentation);
  }
  if (typeof entry === "string") {
    return normalizeLineBreaks(entry);
  }
  return "";
};

/**
 * Checks if a segment overlaps with another segment in any language
 */
export const segmentsOverlap = (
  segment1: TextSegment,
  segment2: TextSegment,
  language?: Script
): boolean => {
  const languagesToCheck = language
    ? [language]
    : (["te", "hi", "en"] as Script[]);
  return languagesToCheck.some((lang) => {
    const range1 = segment1.textReferences?.[lang];
    const range2 = segment2.textReferences?.[lang];
    if (!range1 || !range2) return false;
    return !(range1.end <= range2.start || range2.end <= range1.start);
  });
};

/**
 * Validates that a text range is valid within the given content
 */
export const isValidTextRange = (
  range: { start: number; end: number },
  content: ContentMap,
  language: Script
): boolean => {
  const text = getDisplayText(content, language);
  return (
    range.start >= 0 && range.end <= text.length && range.start <= range.end
  );
};

/**
 * Gets the audio mappings for a specific segment
 */
export const getMappingsForSegment = (
  segment: TextSegment,
  mappings: AudioMapping[]
): AudioMapping[] => {
  return mappings.filter((mapping) => mapping.segmentId === segment.id);
};

/**
 * Calculates total mapped duration for a segment across all audio files
 */
export const getTotalMappedDuration = (
  segment: TextSegment,
  mappings: AudioMapping[]
): number => {
  const segmentMappings = getMappingsForSegment(segment, mappings);
  return segmentMappings.reduce(
    (total, mapping) => total + (mapping.endTime - mapping.startTime),
    0
  );
};
