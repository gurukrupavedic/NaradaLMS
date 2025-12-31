/**
 * Matrix Utility Functions
 * 
 * Color mapping, label formatting, and helper functions for the unified batch matrix
 */

import { ProficiencyLevel } from '../types/matrix';

/**
 * Get Tailwind CSS classes for a proficiency cell based on level and status
 * 
 * Color scheme:
 * - Absent: gray-100 / gray-400 text
 * - Practicing: yellow-50 / yellow-700 text
 * - L1 (50%): green-100 / green-700 text
 * - L2 (70%): green-200 / green-700 text
 * - L3 (90% Ready): blue-100 / blue-700 text
 * - L4 (95% Certified): purple-100 / purple-700 text
 */
export function getCellColor(
  level: ProficiencyLevel,
  status: 'practicing' | 'completed' | 'absent' | 'not_started'
): {
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  // Absent takes priority
  if (level === -1 || status === 'absent') {
    return {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
      borderColor: 'border-gray-300',
    };
  }

  // Status-based: not_started
  if (status === 'not_started') {
    return {
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-400',
      borderColor: 'border-gray-200',
    };
  }

  // Proficiency level based colors
  switch (level) {
    case 0: // Practicing
      return {
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
      };

    case 1: // 50%
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        borderColor: 'border-green-300',
      };

    case 2: // 70%
      return {
        bgColor: 'bg-green-200',
        textColor: 'text-green-800',
        borderColor: 'border-green-400',
      };

    case 3: // 90% Ready
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-300',
      };

    case 4: // 95% Certified
      return {
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-300',
      };

    default:
      return {
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-200',
      };
  }
}

/**
 * Get human-readable label for a proficiency level
 */
export function getProficiencyLabel(level: ProficiencyLevel): string {
  switch (level) {
    case -1:
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
    case -1:
      return 'Abs';
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
    case -1:
      return 'Student was absent or not evaluated';
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
    case -1:
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
    case -1:
      return 'destructive'; // Absent
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
  if (a === -1) return 1;
  if (b === -1) return -1;

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
    case -1:
    default:
      return 0;
  }
}

/**
 * Proficiency levels for UI dropdowns (in order of selection)
 */
export const PROFICIENCY_OPTIONS: Array<{ value: ProficiencyLevel; label: string; description: string }> = [
  {
    value: -1,
    label: 'Absent',
    description: 'Student was absent or not evaluated',
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
  return level === -1 || status === 'not_started';
}
