import { useState, useRef } from 'react';
import {
    Music,
    Upload,
    Plus,
    Pencil,
    Trash2,
    Loader2,
} from 'lucide-react';
import {
    Button,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    cn
} from '@narada/ui';
import { useAudioManagement } from '@/lib/content/hooks/useAudioManagement';
import { AudioPlayerControls, AudioPlayerControlsProps } from '@/components/common/AudioPlayerControls';

export interface AudioFileManagerProps extends Omit<AudioPlayerControlsProps, 'title' | 'className'> {
    chapterId: string;
    selectedAudioFileId: number | null;
    onAudioFileChange: (fileId: number | null) => void;
    children?: React.ReactNode;
    disabled?: boolean;
    // Explicitly list audio control props to avoid type errors
    togglePlayPause?: () => void;
    seek?: (time: number) => void;
    volume?: number;
    onVolumeChange?: (volume: number) => void;
    isMuted?: boolean;
    toggleMute?: () => void;
}

// Utility functions
const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function AudioFileManager({
    chapterId,
    selectedAudioFileId,
    onAudioFileChange,
    children,
    disabled = false,
    togglePlayPause,
    seek,
    volume,
    onVolumeChange,
    isMuted,
    toggleMute,
    ...audioPlayerProps
}: AudioFileManagerProps) {

    const {
        audioFiles,
        uploadFile,
        isUploading,
        deleteFile,
        isDeleting,
        setEditingFileName,
        saveFileName,
        isSaving,
    } = useAudioManagement(chapterId);

    // Modal states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [tempFileName, setTempFileName] = useState('');

    // Upload states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    const selectedAudioFile = audioFiles?.find(f => f.id === selectedAudioFileId);

    // File upload handlers
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
                    const newId = data?.audioFile?.id || data?.id; // backend response adaptation
                    if (newId) {
                        onAudioFileChange(newId);
                    }
                }
            });
        }
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
                    const newId = data?.audioFile?.id || data?.id;
                    if (newId) {
                        onAudioFileChange(newId);
                    }
                }
            });
        }
    };

    // Action handlers
    const handleEditClick = () => {
        if (selectedAudioFile) {
            setTempFileName(selectedAudioFile.displayName || selectedAudioFile.filename);
            setIsEditDialogOpen(true);
        }
    };

    const handleSaveEdit = () => {
        if (selectedAudioFileId && tempFileName.trim()) {
            setEditingFileName(tempFileName);
            saveFileName(selectedAudioFileId);
            setIsEditDialogOpen(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (selectedAudioFileId) {
            deleteFile(selectedAudioFileId, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false);
                    onAudioFileChange(0);
                }
            });
        }
    };

    // Empty State (Full Panel Drag-and-Drop)
    if ((!audioFiles || audioFiles.length === 0) && !isUploading) {
        return (
            <div className="h-full flex flex-col bg-card">
                <div className="h-11 bg-muted border-b shrink-0 flex items-center px-4 md:hidden">
                    <span className="text-sm font-medium text-muted-foreground">Audio Files</span>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disabled}
                    aria-label="Upload audio file"
                />

                <div className="flex-1 overflow-auto p-4 flex flex-col">
                    <div
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg transition-all cursor-pointer",
                            dragActive
                                ? "border-primary bg-primary/5 scale-[0.98]"
                                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={handleUploadClick}
                    >
                        <div className={cn(
                            "bg-background p-4 rounded-full shadow-sm mb-4 transition-transform",
                            dragActive && "scale-110"
                        )}>
                            <Music className="w-10 h-10 text-primary/40" />
                        </div>

                        <p className="text-base font-semibold text-foreground mb-1">No Audio Files</p>
                        <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                            {dragActive ? "Drop to upload" : "Drag & drop an audio file here or click to browse"}
                        </p>

                        <div className="space-y-2 text-xs text-muted-foreground">
                            <p>Supports: MP3, WAV, M4A</p>
                            <p>Maximum: 100 MB</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active State
    return (
        <div className="flex flex-col h-full bg-card">
            <div className="h-11 bg-muted border-b shrink-0 flex items-center px-4 md:hidden">
                <span className="text-sm font-medium text-muted-foreground">Audio Files</span>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled}
            />

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* File Selector + Action Buttons */}
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Select
                            value={selectedAudioFileId?.toString() || ''}
                            onValueChange={(val) => onAudioFileChange(parseInt(val))}
                            disabled={disabled || isUploading}
                        >
                            <SelectTrigger className="flex-1 min-w-[140px] h-9 text-sm">
                                <SelectValue placeholder="Select file..." />
                            </SelectTrigger>
                            <SelectContent>
                                {audioFiles?.map((file) => (
                                    <SelectItem key={file.id} value={file.id.toString()}>
                                        {file.displayName || file.filename}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 flex-shrink-0 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all"
                            onClick={handleUploadClick}
                            disabled={disabled || isUploading}
                            title="Upload new file"
                            aria-label="Upload audio file"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex justify-between items-center px-0.5">
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={handleEditClick}
                                disabled={disabled || !selectedAudioFile}
                                title="Rename file"
                            >
                                <Pencil className="h-3 w-3 mr-1.5" />
                                Rename
                            </Button>

                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={handleDeleteClick}
                                disabled={disabled || !selectedAudioFile}
                                title="Delete file"
                            >
                                <Trash2 className="h-3 w-3 mr-1.5" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Upload Indicator */}
                {isUploading && (
                    <div className="flex items-center justify-center p-4 bg-muted/20 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Uploading...</span>
                        </div>
                    </div>
                )}

                {/* Audio Player Controls */}
                {!isUploading && selectedAudioFile && (
                    <AudioPlayerControls
                        {...audioPlayerProps}
                        // Helper to bridge togglePlayPause to onPlay/onPause
                        onPlay={togglePlayPause ? () => { if (!audioPlayerProps.isPlaying) togglePlayPause(); } : undefined}
                        onPause={togglePlayPause ? () => { if (audioPlayerProps.isPlaying) togglePlayPause(); } : undefined}
                        onSeek={seek}
                        volume={volume}
                        onVolumeChange={onVolumeChange}
                        isMuted={isMuted}
                        onMuteToggle={toggleMute}
                        title={selectedAudioFile.displayName || selectedAudioFile.filename}
                        headerContent={formatBytes(selectedAudioFile.fileSize)}
                        className="border-border shadow-sm"
                    />
                )}

                {/* Session Controls Slot */}
                {children}
            </div>

            {/* Edit Filename Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Audio File</DialogTitle>
                        <DialogDescription>
                            Enter a new display name for this audio file.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={tempFileName}
                            onChange={(e) => setTempFileName(e.target.value)}
                            placeholder="Enter filename..."
                            maxLength={100}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={!tempFileName.trim() || isSaving}>
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Audio File & Mapping?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <span className="font-medium text-foreground">{selectedAudioFile?.displayName || selectedAudioFile?.filename}</span>.
                            <br /><br />
                            <span className="text-destructive font-medium">Warning:</span> Any mappings associated with this file will also be removed. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete File'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
