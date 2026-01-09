import React from 'react';
import { Music } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AudioFileItem } from './AudioFileItem';

interface AudioFile {
    id: number;
    filename: string;
    displayName?: string;
    duration: number;
    url: string;
    fileSize?: number;
}

interface AudioFileListProps {
    files: AudioFile[];
    editingFileId: number | null;
    editingFileName: string;
    onStartEditing: (fileId: number, currentName: string) => void;
    onCancelEditing: () => void;
    onSaveFileName: (fileId: number) => void;
    onDeleteFile: (fileId: number, fileName: string) => void;
    onFileNameChange: (name: string) => void;
    isSaving: boolean;
    disabled?: boolean;
}

export function AudioFileList({
    files,
    editingFileId,
    editingFileName,
    onStartEditing,
    onCancelEditing,
    onSaveFileName,
    onDeleteFile,
    onFileNameChange,
    isSaving,
    disabled,
}: AudioFileListProps) {
    if (files.length === 0) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Audio Files</h3>
                    <p className="text-muted-foreground">
                        Upload audio files to start creating segments for this chapter
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Uploaded Files ({files.length})
            </h4>

            {files.map((file) => (
                <AudioFileItem
                    key={file.id}
                    file={file}
                    isEditing={editingFileId === file.id}
                    editingFileName={editingFileName}
                    onStartEditing={() =>
                        onStartEditing(file.id, file.displayName || file.filename)
                    }
                    onCancelEditing={onCancelEditing}
                    onSaveFileName={() => onSaveFileName(file.id)}
                    onDeleteFile={() => onDeleteFile(file.id, file.displayName || file.filename)}
                    onFileNameChange={onFileNameChange}
                    isSaving={isSaving}
                    disabled={disabled}
                />
            ))}
        </div>
    );
}
