'use client';

import { AlertCircle, Check, Loader } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import {
  Chapter,
  StudentMatrixRow,
  ProficiencyLevel,
  MatrixEvaluationModalProps,
} from '../types/matrix';
import {
  PROFICIENCY_OPTIONS,
  getCellColor,
  getProficiencyLabel,
} from '../utils/matrix-utils';

/**
 * MatrixEvaluationModal Component
 * 
 * Modal for updating a student's proficiency level on a specific chapter.
 * Shows:
 * - Student name and chapter code
 * - Current proficiency level (if any)
 * - All available levels with descriptions
 * - Load and error states
 */
export function MatrixEvaluationModal({
  isOpen,
  student,
  chapter,
  currentProficiency,
  onClose,
  onUpdate,
  isUpdating = false,
  isError = false,
  errorMessage = 'Failed to update proficiency',
}: MatrixEvaluationModalProps) {
  const handleSelectLevel = async (level: ProficiencyLevel) => {
    if (level === currentProficiency) {
      // Selecting same level, just close
      onClose();
      return;
    }

    try {
      await onUpdate(level);
    } catch (error) {
      // Error is handled by parent component
    }
  };

  if (!student || !chapter) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl rounded-xl border border-gray-200 dark:border-gray-700 z-50 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
          <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">Update Progress</DialogTitle>
          <DialogDescription className="sr-only">Update student proficiency level</DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4">
          {/* Student and Chapter Info */}
          <div className="space-y-1 mb-4 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Student:</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">{student.firstName} {student.lastName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Chapter:</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">{chapter.code} - {chapter.title}</span>
            </div>
          </div>

          {/* Error message */}
          {isError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 p-2.5 mb-4 text-xs text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Proficiency level options */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2.5">Select Proficiency Level:</div>

            <div className="space-y-1.5">
              {PROFICIENCY_OPTIONS.map((option) => {
                const isSelected = option.value === currentProficiency;
                const colors = getCellColor(option.value, 'practicing');

                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelectLevel(option.value)}
                    disabled={isUpdating}
                    style={
                      isSelected
                        ? {
                            backgroundColor: colors.bgHex,
                            borderColor: colors.borderHex,
                          }
                        : {}
                    }
                    className={`
                      w-full rounded-lg border-2 p-2.5 text-left transition-all
                      disabled:cursor-not-allowed disabled:opacity-50
                      flex items-center gap-2.5 group
                      ${
                        isSelected
                          ? ''
                          : `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500`
                      }
                    `}
                  >
                    {/* Color indicator circle - legend showing cell color */}
                    <div
                      className="flex-shrink-0 w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: colors.circleHex }}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium text-xs"
                        style={{ color: isSelected ? colors.textHex : '#111827' }}
                      >
                        {option.label}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{
                          color: isSelected
                            ? colors.textHex
                            : '#4B5563',
                        }}
                      >
                        {option.description}
                      </div>
                    </div>

                    {/* Loading spinner */}
                    {isSelected && isUpdating && (
                      <div className="ml-1 flex-shrink-0">
                        <Loader
                          className="h-3.5 w-3.5 animate-spin"
                          style={{ color: colors.textHex }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset button */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => handleSelectLevel(9)}
              disabled={isUpdating}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset / Not Started
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          Changes save locally to this prototype
        </div>
      </DialogContent>
    </Dialog>
  );
}
