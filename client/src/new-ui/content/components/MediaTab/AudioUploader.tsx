import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioUploaderProps {
    onUpload: (file: File) => void;
    isUploading: boolean;
    isDragOver: boolean;
    setIsDragOver: (isDragOver: boolean) => void;
    disabled?: boolean;
}

export function AudioUploader({
    onUpload,
    isUploading,
    isDragOver,
    setIsDragOver,
    disabled,
}: AudioUploaderProps) {
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (disabled) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && files[0].type.match(/^(audio|video)\//)) {
            onUpload(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            onUpload(files[0]);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    return (
        <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragOver
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
            onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
                <p className="text-sm font-medium">Upload Audio Files</p>
                <p className="text-xs text-muted-foreground">
                    Drag and drop files here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                    Supports: MP3, WAV, M4A, MP4, and other audio/video formats (Max 100MB)
                </p>
            </div>
            <Button
                variant="outline"
                className="mt-2"
                onClick={() => document.getElementById('audio-upload-input')?.click()}
                disabled={isUploading || disabled}
            >
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
            </Button>
            <input
                id="audio-upload-input"
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading || disabled}
            />
        </div>
    );
}
