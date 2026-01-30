/**
 * Application-wide constants and configuration values
 * Centralized location for all magic numbers and configuration
 */

// Session & Authentication Configuration
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
export const SESSION_MAX_AGE_MS = 3600 * 1000; // 1 hour

// Database Configuration
export const DB_CONNECTION_TIMEOUT_MS = 10000; // 10 seconds
export const DB_MAX_CONNECTIONS = 20;

// Logging & Error Handling
export const LOG_TRUNCATE_LENGTH = 80;
export const DEFAULT_ERROR_STATUS = 500;

// Development Data Defaults
export const DEFAULT_TRACK_HOURS = 120;
export const DEFAULT_INSTRUCTOR_HOURS = 100;
export const DEFAULT_STUDENT_HOURS = 80;
export const INITIAL_ID_COUNTER = 100;

// Performance & Calculation
export const PROFICIENCY_DECIMAL_PLACES = 100; // For Math.round(x * 100) / 100
export const PROGRESS_PERCENTAGE_MULTIPLIER = 100;

// File Upload Configuration
export const FILE_UPLOAD = {
  maxSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a']
};

// UI Constants
export const SCRIPTS = ['te', 'hi', 'en'] as const;
export const SCRIPT_LABELS = {
  te: 'Telugu',
  hi: 'Hindi',
  en: 'English'
} as const;

// Student Proficiency Levels
// Based on instructor evaluation in batch context
export const PROFICIENCY_LEVELS = {
  0: { label: 'Started', description: 'Attended class, practicing', color: 'yellow' },
  1: { label: '50% Proficiency', description: 'Basic understanding', color: 'light-green' },
  2: { label: '70% Proficiency', description: 'Good understanding', color: 'dark-green' },
  3: { label: '90% Proficiency', description: 'Ready for certification', color: 'light-purple' },
  4: { label: '95% Proficiency', description: 'Certified/Mastered', color: 'dark-purple' },
  8: { label: 'Absent', description: 'Student absent for class', color: 'gray' },
  9: { label: 'Not Started', description: 'Chapter not yet taught', color: 'white' }
} as const;

export const VALID_PROFICIENCY_LEVELS = [0, 1, 2, 3, 4, 8, 9] as const;
export type ProficiencyLevel = typeof VALID_PROFICIENCY_LEVELS[number];