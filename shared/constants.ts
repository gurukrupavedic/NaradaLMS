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