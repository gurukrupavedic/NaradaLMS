/**
 * Mapping Session Warning Dialog
 * 
 * Warns users before clearing existing mappings when starting a new mapping session.
 * Prevents accidental loss of mapping work.
 */

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';

interface MappingWarningDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  existingMappingsCount: number;
  audioFileName: string;
}

export const MappingWarningDialog: React.FC<MappingWarningDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  existingMappingsCount,
  audioFileName
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start New Mapping Session?</AlertDialogTitle>
          <AlertDialogDescription>
            This audio file already has {existingMappingsCount} completed mapping{existingMappingsCount !== 1 ? 's' : ''}.
            <br /><br />
            Starting a new mapping session will clear all existing mappings for <strong>{audioFileName}</strong> and allow you to create fresh mappings from scratch.
            <br /><br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Clear & Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
