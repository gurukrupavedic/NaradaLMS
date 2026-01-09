import React, { useState } from 'react';
import { Music, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface AudioFile {
    id: number;
    filename: string;
    displayName?: string;
    duration: number;
    url: string;
    fileSize?: number;
}

interface AudioFileItemProps {
    file: AudioFile;
    isEditing: boolean;
    editingFileName: string;
    onStartEditing: () => void;
    onCancelEditing: () => void;
    onSaveFileName: () => void;
    onDeleteFile: () => void;
    onFileNameChange: (name: string) => void;
    isSaving: boolean;
    disabled?: boolean;
}

export function AudioFileItem({
    file,
    isEditing,
    editingFileName,
    onStartEditing,
    onCancelEditing,
    onSaveFileName,
    onDeleteFile,
    onFileNameChange,
    isSaving,
    disabled,
}: AudioFileItemProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDelete = () => {
        setShowDeleteDialog(false);
        onDeleteFile();
    };

    return (
        <>
            <div className="group border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={editingFileName}
                                    onChange={(e) => onFileNameChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            onSaveFileName();
                                        } else if (e.key === 'Escape') {
                                            onCancelEditing();
                                        }
                                    }}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={onSaveFileName} disabled={isSaving}>
                                        <Save className="w-3 h-3 mr-1" />
                                        Save
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={onCancelEditing}>
                                        <X className="w-3 h-3 mr-1" />
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <Music className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <p className="font-medium text-sm truncate">
                                        {file.displayName || file.filename}
                                    </p>
                                </div>
                                <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>Duration: {file.duration.toFixed(2)}s</span>
                                    {file.fileSize && (
                                        <span>
                                            Size: {(file.fileSize / (1024 * 1024)).toFixed(1)} MB
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {!disabled && !isEditing && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onStartEditing}
                                className="h-8 w-8 p-0"
                            >
                                <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDeleteDialog(true)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Audio File</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{file.displayName || file.filename}"?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
