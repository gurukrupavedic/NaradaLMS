/**
 * API Error Types and Utilities
 * 
 * Provides structured error handling for API requests with categorization,
 * retry logic, and user-friendly error messaging.
 */

export interface ApiError extends Error {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  isNetworkError?: boolean;
  isServerError?: boolean;
  isClientError?: boolean;
  timestamp?: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  };
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatusCodes: number[];
  retryableErrorCodes: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatusCodes: [0, 408, 429, 500, 502, 503, 504],
  retryableErrorCodes: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'DATABASE_CONNECTION_ERROR',
    'TEMPORARY_SERVER_ERROR'
  ]
};

export function createApiError(
  status: number,
  message: string,
  code?: string,
  details?: Record<string, unknown>
): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  error.details = details;
  error.isNetworkError = status === 0 || status >= 500;
  error.isServerError = status >= 500 && status < 600;
  error.isClientError = status >= 400 && status < 500;
  error.timestamp = new Date().toISOString();

  return error;
}

export function isRetryableError(
  error: ApiError,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  // Network errors are always retryable
  if (error.isNetworkError) return true;

  // Check status codes
  if (config.retryableStatusCodes.includes(error.status)) return true;

  // Check error codes
  if (error.code && config.retryableErrorCodes.includes(error.code)) return true;

  // Client errors (4xx) are generally not retryable except for specific cases
  if (error.isClientError) {
    return error.status === 408 || error.status === 429; // Timeout or Rate limit
  }

  return false;
}

export function calculateRetryDelay(
  attemptIndex: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff with jitter
  const delay = Math.min(
    config.baseDelay * Math.pow(2, attemptIndex),
    config.maxDelay
  );

  // Add jitter to prevent thundering herd
  const jitter = delay * 0.1 * Math.random();

  return Math.floor(delay + jitter);
}

export function getErrorCategory(error: ApiError): 'network' | 'server' | 'client' | 'validation' | 'auth' | 'unknown' {
  if (error.isNetworkError) return 'network';
  if (error.isServerError) return 'server';

  if (error.isClientError) {
    if (error.status === 401 || error.status === 403) return 'auth';
    if (error.status === 400 || error.status === 422) return 'validation';
    return 'client';
  }

  return 'unknown';
}

export function getUserFriendlyMessage(error: ApiError, operation?: string): string {
  const category = getErrorCategory(error);
  const context = operation ? ` ${operation}` : '';

  switch (category) {
    case 'network':
      return `Network connection lost while${context}. Please check your internet connection and try again.`;

    case 'server':
      if (error.code === 'DATABASE_CONNECTION_ERROR') {
        return `Service temporarily unavailable${context}. Please try again in a few moments.`;
      }
      return `Server error occurred while${context}. Please try again later.`;

    case 'auth':
      return error.status === 401
        ? 'Your session has expired. Please log in again.'
        : 'You do not have permission to perform this action.';

    case 'validation':
      return (error.details?.message as string) || error.message || `Invalid input data${context}. Please check your inputs and try again.`;

    case 'client':
      switch (error.status) {
        case 404:
          return `The requested resource was not found.`;
        case 409:
          return `This action conflicts with existing data. Please check and try again.`;
        case 413:
          return `File too large. Please use a smaller file.`;
        case 415:
          return `Unsupported file type. Please use a different file format.`;
        case 429:
          return `Too many requests. Please wait a moment and try again.`;
        default:
          return error.message || `An error occurred while${context}.`;
      }

    default:
      return error.message || `An unexpected error occurred while${context}.`;
  }
}

export function shouldShowRetryButton(error: ApiError): boolean {
  const category = getErrorCategory(error);
  return category === 'network' || category === 'server' || error.status === 429;
}

export function getRetryButtonText(error: ApiError): string {
  if (error.status === 429) return 'Try Again';
  if (getErrorCategory(error) === 'network') return 'Retry';
  return 'Try Again';
}

// Error logging utilities
export function logError(error: ApiError, context?: string) {
  const logData = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: error.message,
      status: error.status,
      code: error.code,
      category: getErrorCategory(error),
      requestId: error.requestId,
    },
    stack: error.stack,
  };

  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 API Error${context ? ` (${context})` : ''}`);
    console.error('Error Details:', logData);
    console.groupEnd();
  }

  // In production, you might want to send this to an error tracking service
  // Example: ErrorTrackingService.captureError(logData);
}

// Common error messages for specific operations
export const ERROR_MESSAGES = {
  UPLOAD: {
    FILE_TOO_LARGE: 'File size exceeds the maximum limit of 50MB.',
    INVALID_FORMAT: 'Invalid file format. Please use MP3, WAV, M4A, or other supported audio formats.',
    UPLOAD_FAILED: 'File upload failed. Please try again.',
    NETWORK_ERROR: 'Upload failed due to network issues. Please check your connection and try again.',
  },
  SEGMENT: {
    INVALID_SELECTION: 'Invalid text selection. Please select a different text range.',
    OVERLAP_ERROR: 'This text range overlaps with an existing segment. Please select a different range.',
    TOO_SHORT: 'Selected text is too short. Please select at least 10 characters.',
    CREATE_FAILED: 'Failed to create segment. Please try again.',
  },
  MAPPING: {
    INVALID_TIMING: 'Invalid timing data. Please check the audio timestamps.',
    NO_AUDIO: 'No audio file selected. Please select an audio file first.',
    CREATE_FAILED: 'Failed to create mapping. Please try again.',
  },
  TRACK: {
    TITLE_REQUIRED: 'Track title is required.',
    TITLE_TOO_LONG: 'Track title must be less than 100 characters.',
    DUPLICATE_TITLE: 'A track with this title already exists.',
    CREATE_FAILED: 'Failed to create track. Please try again.',
  },
  CHAPTER: {
    TITLE_REQUIRED: 'Chapter title is required.',
    INVALID_STATUS: 'Invalid chapter status.',
    UPDATE_FAILED: 'Failed to update chapter. Please try again.',
  },
} as const;