'use client';

import { AlertCircle, Loader } from 'lucide-react';

import { Button } from '@narada/ui';
// import { Separator } from '@narada/ui'; // Unused in original but kept if needed

import {
    MatrixEvaluationModalProps,
    ProficiencyLevel,
} from './types';
import {
    PROFICIENCY_OPTIONS,
    getCellColor,
} from './utils';

// Temporary fix if Dialog components not exported from @narada/ui top level
// Assuming standard shadcn structure where Dialog is a composite
import { Dialog as UiDialog, DialogContent as UiDialogContent, DialogHeader as UiDialogHeader, DialogTitle as UiDialogTitle, DialogDescription as UiDialogDescription } from '@narada/ui';

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
        <UiDialog open={isOpen} onOpenChange={onClose}>
            <UiDialogContent className="sm:max-w-[500px] bg-background">
                <UiDialogHeader>
                    <UiDialogTitle>Update Proficiency</UiDialogTitle>
                    <UiDialogDescription className="sr-only">
                        Evaluate progress for {student.firstName} {student.lastName}
                    </UiDialogDescription>
                </UiDialogHeader>

                <div className="py-4">
                    <div className="space-y-4">
                        {/* Students & Chapter Info */}
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold leading-none tracking-tight">{student.firstName} {student.lastName}</h3>
                            <p className="text-sm text-muted-foreground mt-2">{chapter.code} - {chapter.title}</p>
                        </div>

                        {/* Error message */}
                        {isError && (
                            <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* Proficiency Options Grid */}
                        <div className="grid gap-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Select Level
                            </div>

                            {PROFICIENCY_OPTIONS.map((option) => {
                                const isSelected = option.value === currentProficiency;
                                const colors = getCellColor(option.value, 'practicing');

                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectLevel(option.value)}
                                        disabled={isUpdating}
                                        className={`
                      group relative flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all
                      hover:bg-muted/50 hover:shadow-sm
                      ${isSelected
                                                ? 'border-2 shadow-sm bg-muted/20'
                                                : 'border-border'
                                            }
                      disabled:cursor-not-allowed disabled:opacity-50
                    `}
                                        style={{
                                            borderColor: isSelected ? colors.borderHex : undefined,
                                        }}
                                    >
                                        {/* Status Dot */}
                                        <div
                                            className="h-5 w-5 shrink-0 rounded-full shadow-sm ring-1 ring-white/20"
                                            style={{ backgroundColor: colors.circleHex }}
                                        />

                                        <div className="grid gap-1.5 flex-1">
                                            <div className="text-sm font-bold leading-none text-foreground">
                                                {option.label}
                                            </div>
                                            <div className="text-xs text-muted-foreground leading-snug">
                                                {option.description}
                                            </div>
                                        </div>

                                        {/* Loading Spinner */}
                                        {isSelected && isUpdating && (
                                            <div className="absolute right-3 top-3 text-muted-foreground">
                                                <Loader className="h-4 w-4 animate-spin" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="pt-2 pb-1">
                    <Button
                        variant="link"
                        onClick={() => handleSelectLevel(9)}
                        disabled={isUpdating}
                        className="h-auto p-0 text-sm font-semibold text-destructive hover:text-destructive/80 hover:no-underline justify-start"
                    >
                        Reset / Not Started
                    </Button>
                </div>
            </UiDialogContent>
        </UiDialog>
    );
}
