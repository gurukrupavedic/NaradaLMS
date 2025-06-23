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
} from '@/components/ui/alert-dialog';

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
          <AlertDialogTitle>Clear Existing Mappings?</AlertDialogTitle>
          <AlertDialogDescription>
            This will clear {existingMappingsCount} existing mapping{existingMappingsCount !== 1 ? 's' : ''} for "{audioFileName}".
            <br /><br />
            You can continue to remap all segments, or cancel to keep your current mappings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Clear and Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};