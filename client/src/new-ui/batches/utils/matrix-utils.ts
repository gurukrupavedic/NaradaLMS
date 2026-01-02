/**
 * Matrix Utility Functions
 * 
 * Color mapping, label formatting, and helper functions for the unified batch matrix
 */

import { ProficiencyLevel } from '../types/matrix';

/**
 * Get Tailwind CSS classes for a proficiency cell based on level and status
 * 
 * Color scheme (custom hex codes):
 * - Absent: #F3F4F6 / #6B7280 text
 * - Practicing: #FEF3C7 / #92400E text
 * - L1 (50%): #D1FAE5 / #065F46 text
 * - L2 (70%): #86EFAC / #166534 text
 * - L3 (90% Ready): #E9D5FF / #6B21A8 text
 * - L4 (95% Certified): #D8B4FE / #581C87 text
 */
export function getCellColor(
  level: ProficiencyLevel,
  status: 'practicing' | 'completed' | 'absent' | 'not_started'
): {
  bgColor: string;
  textColor: string;
  borderColor: string;
  darkBgColor: string;
  darkTextColor: string;
  darkBorderColor: string;
  bgHex: string;
  borderHex: string;
  circleHex: string;
  textHex: string;
} {
  // Absent takes priority
  if (level === 8 || status === 'absent') {
    return {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
      borderColor: 'border-gray-300',
      darkBgColor: 'dark:bg-gray-800',
      darkTextColor: 'dark:text-gray-400',
      darkBorderColor: 'dark:border-gray-600',
      bgHex: '#F3F4F6',
      borderHex: '#D1D5DB',
      circleHex: '#9CA3AF',
      textHex: '#4B5563',
    };
  }

  // Status-based: not_started
  if (status === 'not_started') {
    return {
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-400',
      borderColor: 'border-gray-200',
      darkBgColor: 'dark:bg-gray-900',
      darkTextColor: 'dark:text-gray-500',
      darkBorderColor: 'dark:border-gray-700',
      bgHex: '#F9FAFB',
      borderHex: '#E5E7EB',
      circleHex: '#D1D5DB',
      textHex: '#9CA3AF',
    };
  }

  // Proficiency level based colors
  switch (level) {
    case 0: // Practicing
      return {
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-900',
        borderColor: 'border-amber-300',
        darkBgColor: 'dark:bg-amber-900/30',
        darkTextColor: 'dark:text-amber-200',
        darkBorderColor: 'dark:border-amber-700',
        bgHex: '#FEF3C7',
        borderHex: '#FCD34D',
        circleHex: '#F59E0B',
        textHex: '#78350F',
      };

    case 1: // L1 (50%)
      return {
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-800',
        borderColor: 'border-emerald-300',
        darkBgColor: 'dark:bg-emerald-900/30',
        darkTextColor: 'dark:text-emerald-200',
        darkBorderColor: 'dark:border-emerald-700',
        bgHex: '#F0FDF4',
        borderHex: '#6EE7B7',
        circleHex: '#059669',
        textHex: '#065F46',
      };

    case 2: // L2 (70%)
      return {
        bgColor: 'bg-green-500',
        textColor: 'text-white',
        borderColor: 'border-green-600',
        darkBgColor: 'dark:bg-green-700',
        darkTextColor: 'dark:text-white',
        darkBorderColor: 'dark:border-green-800',
        bgHex: '#22C55E',
        borderHex: '#16A34A',
        circleHex: '#15803D',
        textHex: '#FFFFFF',
      };

    case 3: // L3 (90% Ready)
      return {
        bgColor: 'bg-violet-100',
        textColor: 'text-violet-900',
        borderColor: 'border-violet-300',
        darkBgColor: 'dark:bg-violet-900/30',
        darkTextColor: 'dark:text-violet-200',
        darkBorderColor: 'dark:border-violet-700',
        bgHex: '#EDE9FE',
        borderHex: '#C4B5FD',
        circleHex: '#7C3AED',
        textHex: '#4C1D95',
      };

    case 4: // L4 (95% Certified)
      return {
        bgColor: 'bg-purple-600',
        textColor: 'text-white',
        borderColor: 'border-purple-700',
        darkBgColor: 'dark:bg-purple-800',
        darkTextColor: 'dark:text-white',
        darkBorderColor: 'dark:border-purple-900',
        bgHex: '#9333EA',
        borderHex: '#7E22CE',
        circleHex: '#6B21A8',
        textHex: '#FFFFFF',
      };

    default:
      return {
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-200',
        darkBgColor: 'dark:bg-gray-900',
        darkTextColor: 'dark:text-gray-400',
        darkBorderColor: 'dark:border-gray-700',
        bgHex: '#F9FAFB',
        borderHex: '#E5E7EB',
        circleHex: '#D1D5DB',
        textHex: '#4B5563',
      };
  }
}

/**
 * Get human-readable label for a proficiency level
 */
export function getProficiencyLabel(level: ProficiencyLevel): string {
  switch (level) {
    case 8:
      return 'Absent';
    case 0:
      return 'Practicing';
    case 1:
      return 'L1 (50%)';
    case 2:
      return 'L2 (70%)';
    case 3:
      return 'L3 (90%)';
    case 4:
      return 'L4 (95%)';
    default:
      return 'Not Started';
  }
}

/**
 * Get short label for cell display (2-3 characters max)
 */
export function getProficiencyShortLabel(level: ProficiencyLevel): string {
  switch (level) {
    case 8:
      return 'Abs';
    case 9:
      return 'NS';
    case 0:
      return 'Prac';
    case 1:
      return 'L1';
    case 2:
      return 'L2';
    case 3:
      return 'L3';
    case 4:
      return 'L4';
    default:
      return '—';
  }
}

/**
 * Get description text for modal or tooltip
 */
export function getProficiencyDescription(level: ProficiencyLevel): string {
  switch (level) {
    case 8:
      return 'Student was absent for this session';
    case 9:
      return 'Chapter not yet taught';
    case 0:
      return 'Currently learning, minimal competency';
    case 1:
      return 'Basic recitation capability, needs practice';
    case 2:
      return 'Good flow, minor corrections needed';
    case 3:
      return 'Ready for certification exam';
    case 4:
      return 'Mastered and certified';
    default:
      return 'No evaluation yet';
  }
}

/**
 * Get certification status label
 */
export function getCertificationStatus(level: ProficiencyLevel): 'certified' | 'ready' | 'in-progress' | 'not-started' {
  switch (level) {
    case 4:
      return 'certified';
    case 3:
      return 'ready';
    case 0:
    case 1:
    case 2:
      return 'in-progress';
    case 8:
    case 9:
    default:
      return 'not-started';
  }
}

/**
 * Get badge variant for proficiency level
 * Used for styling badges in the matrix or modal
 */
export function getProficiencyVariant(
  level: ProficiencyLevel
): 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info' {
  switch (level) {
    case 4:
      return 'success'; // Certified
    case 3:
      return 'info'; // Ready
    case 2:
      return 'warning'; // L2
    case 1:
      return 'default'; // L1
    case 0:
      return 'secondary'; // Practicing
    case 8:
      return 'destructive'; // Absent
    case 9:
      return 'outline'; // Not Started
    default:
      return 'outline';
  }
}

/**
 * Sort proficiency levels by completeness (for filtering/sorting)
 * Higher numbers (more complete) come first
 */
export function sortByProficiency(
  a: ProficiencyLevel,
  b: ProficiencyLevel
): number {
  // Absent always last
  if (a === 8) return 1;
  if (b === 8) return -1;

  // Sort descending (4, 3, 2, 1, 0)
  return b - a;
}

/**
 * Get progress percentage based on level
 */
export function getProgressPercentage(level: ProficiencyLevel): number {
  switch (level) {
    case 4:
      return 100;
    case 3:
      return 90;
    case 2:
      return 70;
    case 1:
      return 50;
    case 0:
      return 20;
    case 8:
    case 9:
    default:
      return 0;
  }
}

/**
 * Proficiency levels for UI dropdowns (in order of selection)
 */
export const PROFICIENCY_OPTIONS: Array<{ value: ProficiencyLevel; label: string; description: string }> = [
  {
    value: 8,
    label: 'Absent',
    description: 'Student was absent for this session',
  },
  {
    value: 0,
    label: 'Practicing',
    description: 'Currently learning, minimal competency',
  },
  {
    value: 1,
    label: 'L1 (50%)',
    description: 'Basic recitation capability, needs practice',
  },
  {
    value: 2,
    label: 'L2 (70%)',
    description: 'Good flow, minor corrections needed',
  },
  {
    value: 3,
    label: 'L3 (90% Ready)',
    description: 'Ready for certification exam',
  },
  {
    value: 4,
    label: 'L4 (95% Certified)',
    description: 'Mastered and certified',
  },
];

/**
 * Get the next proficiency level in progression
 * Useful for "advance level" button
 */
export function getNextLevel(current: ProficiencyLevel): ProficiencyLevel | null {
  const progression: ProficiencyLevel[] = [0, 1, 2, 3, 4];
  const index = progression.indexOf(current);

  if (index === -1 || index === progression.length - 1) {
    return null; // Already at max or not in progression
  }

  return progression[index + 1];
}

/**
 * Check if student is ready for certification
 */
export function isReadyForCertification(level: ProficiencyLevel): boolean {
  return level >= 3;
}

/**
 * Check if student is certified
 */
export function isCertified(level: ProficiencyLevel): boolean {
  return level === 4;
}

/**
 * Check if student needs evaluation
 */
export function needsEvaluation(level: ProficiencyLevel, status: string): boolean {
  return level === 8 || level === 9 || status === 'not_started';
}
