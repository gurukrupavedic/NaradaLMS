import React from 'react';
import { Loader2 } from 'lucide-react';

type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved';

interface AutoSaveIndicatorProps {
    saveStatus: SaveStatus;
}

export function AutoSaveIndicator({ saveStatus }: AutoSaveIndicatorProps) {
    if (saveStatus === 'clean') {
        return (
            <span className="text-xs text-gray-500 dark:text-gray-400">
                All changes saved
            </span>
        );
    }

    if (saveStatus === 'dirty') {
        return (
            <span className="text-xs text-yellow-600 dark:text-yellow-500">
                Unsaved changes...
            </span>
        );
    }

    if (saveStatus === 'saving') {
        return (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
            </div>
        );
    }

    if (saveStatus === 'saved') {
        return (
            <span className="text-xs text-green-600 dark:text-green-500">
                Saved ✓
            </span>
        );
    }

    return null;
}
