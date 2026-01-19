/**
 * Utility functions for common operations and styling
 * 
 * Provides essential utility functions including CSS class manipulation,
 * string formatting, date handling, and validation helpers optimized
 * for the Vedic LMS application.
 * 
 * @author Narada LMS Team
 * @since 2025-06-24
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combine and merge CSS classes with Tailwind CSS conflict resolution
 * 
 * @param inputs - Class values to combine (strings, objects, arrays)
 * @returns Merged class string with conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
