/**
 * Authentication utility functions
 * 
 * Provides authentication helpers for user session management,
 * role validation, and Replit Auth integration.
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

/**
 * Check if error indicates unauthorized access
 * 
 * @param error - Error object to check
 * @returns True if error is 401 Unauthorized
 */
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}