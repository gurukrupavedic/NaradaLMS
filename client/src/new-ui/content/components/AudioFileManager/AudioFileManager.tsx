import { useState, useRef, useEffect } from 'react';
import {
    Music,
    Upload,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { useAudioManagement } from '@/new-ui/content/hooks/useAudioManagement';
import { AudioPlayerControls, AudioPlayerControlsProps } from '@/new-ui/components/AudioPlayerControls';
import { cn } from '@/lib/utils';

export interface AudioFileManagerProps extends Omit<AudioPlayerControlsProps, 'title' | 'className'> {
    chapterId: string;
    selectedAudioFileId: number | null;
    onAudioFileChange: (fileId: number) => void;
    // Slot for additional controls (e.g., Mapping Session)
    children?: React.ReactNode;
    disabled?: boolean;
}

// Simple utility if not imported
const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function AudioFileManager({
    chapterId,
    selectedAudioFileId,
    onAudioFileChange,
    children,
    disabled = false,
    ...audioPlayerProps
}: AudioFileManagerProps) {
    const {
        audioFiles,
        uploadFile,
        isUploading,
        deleteFile,
        isDeleting,
        editingFileId,
        editingFileName,
        setEditingFileName,
        startEditing,
        cancelEditing,
        saveFileName,
    } = useAudioManagement(chapterId);

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    // Auto-select newly uploaded file
    // We can't easily detect "newly uploaded" from the hook directly without refactoring, 
    // but the hook invalidates queries. 
    // A simple heuristic: if we have no selection and files exist, select first. 
    // Or if the list grows by one, find the new one. 
    // For now, let's stick to the props control: parent handles selection changes usually 
    // but here we might want to trigger it. 
    // Actually, `useAudioManagement` documentation in plan said "onSuccess: ... Auto-select". 
    // But the current `useAudioManagement` implementation doesn't callback with ID easily to the parent 
    // primarily because it just returns mutation functions. 
    // We can wrap the `uploadFile` call here to intercept success.

    const handleUploadClick = () => {
        if (!disabled) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file, {
                onSuccess: (data: any) => {
                    // Assuming data.audioFile.id exists based on API response structure
                    if (data?.audioFile?.id) {
                        onAudioFileChange(data.audioFile.id);
                    }
                }
            });
        }
        // Reset input
        e.target.value = '';
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (disabled) return;

        const file = e.dataTransfer.files?.[0];
        if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
            uploadFile(file, {
                onSuccess: (data: any) => {
                    if (data?.audioFile?.id) {
                        onAudioFileChange(data.audioFile.id);
                    }
                }
            });
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (selectedAudioFileId) {
            deleteFile(selectedAudioFileId, {
                onSuccess: () => {
                    setIsDeleteConfirmOpen(false);
                    // Parent should handle setting selectedAudioFileId to null or next file 
                    // via the fact that audioFiles list will update.
                    // But we should probably trigger a change to null if the current one is deleted.
                    // The parent logic in MappingTab might need to react to audioFiles changes.
                    // For now, simpler is:
                    onAudioFileChange(0); // or null, depending on type, but prop expects number. 
                    // Actually MappingTab handles "if audioFiles.length > 0 && !selected" logic.
                    // So we just need to ensure the ID is no longer valid.
                }
            });
        }
    };

    const selectedAudioFile = audioFiles.find(f => f.id === selectedAudioFileId);

    // Empty State (No files at all)
    if (audioFiles.length === 0 && !isUploading) {
        return (
            <div
                className={cn(
                    "h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-lg transition-colors",
                    dragActive ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disabled}
                />

                <div className="bg-white p-3 rounded-full shadow-sm mb-4">
                    <Music className="w-8 h-8 text-primary/40" />
                </div>

                <p className="text-sm font-semibold text-gray-900 mb-1">No Audio Files</p>
                <p className="text-xs text-muted-foreground text-balance mb-4 max-w-[200px]">
                    Upload audio files to start mapping segments
                </p>

                <Button
                    onClick={handleUploadClick}
                    disabled={disabled}
                    variant="outline"
                    size="sm"
                >
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    Upload File
                </Button>

                <p className="text-[10px] text-muted-foreground mt-4 opacity-70">
                    Supports: MP3, WAV, M4A (Max 100MB)
                </p>
            </div>
        );
    }

    // Active State
    return (
        <div className="flex flex-col h-full bg-background">
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled}
            />

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Section 1: File Selector & Details */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Audio Source
                        </label>
                        {isUploading && (
                            <span className="flex items-center text-xs text-blue-600 animate-pulse">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Uploading...
                            </span>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Select
                            value={selectedAudioFileId?.toString() || ''}
                            onValueChange={(val) => onAudioFileChange(parseInt(val))}
                            disabled={disabled || isUploading}
                        >
                            <SelectTrigger className="flex-1 h-9 text-sm">
                                <SelectValue placeholder="Select file..." />
                            </SelectTrigger>
                            <SelectContent>
                                {audioFiles.map((file) => (
                                    <SelectItem key={file.id} value={file.id.toString()}>
                                        {file.displayName || file.filename}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 flex-shrink-0"
                            onClick={handleUploadClick}
                            disabled={disabled || isUploading}
                            title="Upload new file"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Compact File Details Card */}
                    {selectedAudioFile && (
                        <div className="bg-gray-50/80 border rounded-md p-3 space-y-2 group relative">
                            {/* Renaming Mode */}
                            {editingFileId === selectedAudioFile.id ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={editingFileName}
                                        onChange={(e) => setEditingFileName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveFileName(selectedAudioFile.id);
                                            if (e.key === 'Escape') cancelEditing();
                                        }}
                                        className="h-7 text-xs"
                                        autoFocus
                                        placeholder="Enter filename..."
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                        onClick={() => saveFileName(selectedAudioFile.id)}
                                    >
                                        <Upload className="h-3 w-3 text-green-600" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate" title={selectedAudioFile.displayName || selectedAudioFile.filename}>
                                            {selectedAudioFile.displayName || selectedAudioFile.filename}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                            {formatDuration(selectedAudioFile.duration)} • {formatBytes(selectedAudioFile.fileSize)}
                                        </p>
                                    </div>

                                    {!disabled && (
                                        <div className="flex items-center -mr-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-gray-400 hover:text-gray-700"
                                                onClick={() => startEditing(selectedAudioFile.id, selectedAudioFile.displayName || selectedAudioFile.filename)}
                                                title="Rename file"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-gray-400 hover:text-red-600"
                                                onClick={handleDeleteClick}
                                                title="Delete file"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Section 2: Audio Player */}
                {selectedAudioFile && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Preview
                        </label>
                        <AudioPlayerControls
                            {...audioPlayerProps}
                            title={undefined} // We show title in the card above
                            className="border-gray-200 shadow-sm"
                            playbackRate={audioPlayerProps.playbackRate}
                        />
                    </div>
                )}

                {/* Section 3: Mapping Controls Slot */}
                {children && (
                    <div className="pt-2">
                        {/* We intentionally don't label this, it should feel organic */}
                        {children}
                    </div>
                )}
            </div>

            {/* Section 4: Bottom Upload Dock */}
            {/* This is a secondary upload area for drag & drop always visible even when files exist */}
            <div
                className={cn(
                    "p-4 border-t bg-gray-50/50 border-gray-100 transition-colors",
                    dragActive && "bg-blue-50 border-blue-200"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {dragActive ? (
                    <div className="flex flex-col items-center justify-center py-2 text-blue-600 animate-pulse">
                        <Upload className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium">Drop to upload</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px]">Drag & drop to upload more</span>
                        {!disabled && (
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleUploadClick}>
                                Browse
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Audio File?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <span className="font-medium text-foreground">{selectedAudioFile?.displayName || selectedAudioFile?.filename}</span>.
                            <br /><br />
                            <span className="text-destructive font-medium">Warning:</span> All mappings associated with this file will also be removed. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete File
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
