/**
 * Application Constants
 * Centralized configuration values and limits
 */

// File Upload Limits
export const FILE_UPLOAD = {
  MAX_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  MAX_SIZE_MB: 100,
  ALLOWED_AUDIO_TYPES: ['audio/*', 'video/*']
} as const;

// API Response Messages
export const ERROR_MESSAGES = {
  TRACK_NOT_FOUND: 'Track not found',
  CHAPTER_NOT_FOUND: 'Chapter not found',
  INVALID_FILE_TYPE: 'Only audio files are allowed',
  UPLOAD_FAILED: 'Failed to upload file',
  GENERIC_ERROR: 'An error occurred'
} as const;

// Application Limits
export const LIMITS = {
  MAX_SEGMENT_LENGTH: 500,
  MAX_CHAPTER_TITLE_LENGTH: 200,
  MAX_TRACK_TITLE_LENGTH: 100
} as const;