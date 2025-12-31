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

  const currentColors = getCellColor(currentProficiency || -1, 'practicing');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white shadow-xl rounded-lg border border-gray-200 z-50">
        <DialogHeader className="mb-4">
          <DialogTitle>Update Proficiency Level</DialogTitle>
          <DialogDescription>
            <div className="mt-2 space-y-1 text-sm">
              <div>
                <strong>Student:</strong> {student.firstName} {student.lastName}
              </div>
              <div>
                <strong>Chapter:</strong> {chapter.code} - {chapter.title}
              </div>
              {currentProficiency !== undefined && (
                <div>
                  <strong>Current:</strong>{' '}
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      currentColors.bgColor
                    } ${currentColors.textColor}`}
                  >
                    {getProficiencyLabel(currentProficiency)}
                  </span>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Error message */}
        {isError && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Proficiency level options */}
        <div className="space-y-2 py-4">
          <div className="text-sm font-medium text-gray-700">Select level:</div>

          {PROFICIENCY_OPTIONS.map((option) => {
            const isSelected = option.value === currentProficiency;
            const colors = getCellColor(option.value, 'practicing');

            return (
              <button
                key={option.value}
                onClick={() => handleSelectLevel(option.value)}
                disabled={isUpdating}
                className={`
                  w-full rounded-lg border-2 p-3 text-left transition-all
                  ${
                    isSelected
                      ? `${colors.borderColor} ring-2 ${colors.bgColor}`
                      : `border-gray-200 hover:border-gray-300`
                  }
                  disabled:cursor-not-allowed disabled:opacity-50
                  flex items-center justify-between
                `}
              >
                <div>
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-600">{option.description}</div>
                </div>

                {isSelected && (
                  <div className="ml-2 flex-shrink-0">
                    {isUpdating ? (
                      <Loader className="h-5 w-5 animate-spin text-blue-600" />
                    ) : (
                      <Check className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
        </div>

        {/* Info text */}
        <div className="text-xs text-gray-500 italic px-2">
          Click a level to update. Changes are saved immediately.
        </div>
      </DialogContent>
    </Dialog>
  );
}
