import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FilePenLine, Scissors, Music } from 'lucide-react';
import { AudioPlayerControls } from '@/components/common/AudioPlayerControls';
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
import { useChapterEditor } from '../../context/ChapterEditorContext';
import { useChapterMetadata } from '../../hooks/useChapterMetadata';

interface ChapterHeaderProps {
    activeTab: string;
    textSegMode: 'editor' | 'segmentation';
    onTextSegModeChange: (mode: 'editor' | 'segmentation') => void;

    // Preview tab specific props
    learnMode?: boolean;
    onLearnModeChange?: (mode: boolean) => void;
    audioFiles?: Array<{ id: number; filename: string; displayName?: string }>;
    selectedAudioFileId?: number | null;
    onAudioFileChange?: (audioFileId: number) => void;

    // Audio player props (from AudioPlayerContext)
    isPlaying?: boolean;
    currentTime?: number;
    duration?: number;
    onPlay?: () => void;
    onPause?: () => void;
    onSeek?: (time: number) => void;
}

export function ChapterHeader({
    activeTab,
    textSegMode,
    onTextSegModeChange,
    // Preview props
    learnMode,
    onLearnModeChange,
    audioFiles = [],
    selectedAudioFileId,
    onAudioFileChange,
    isPlaying,
    currentTime,
    duration,
    onPlay,
    onPause,
    onSeek,
}: ChapterHeaderProps) {
    const { chapter, isLoading } = useChapterEditor();
    const {
        isPublished,
        showUnpublishConfirm,
        handlePublishToggle,
        confirmUnpublish,
        cancelUnpublish,
        isTogglingStatus,
    } = useChapterMetadata();

    if (isLoading) {
        return (
            <div className="bg-background border-b">
                <div className="px-4 py-3">
                    <div className="h-6 w-48 bg-muted rounded animate-pulse mb-2" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-card border-b border-border flex-shrink-0">
                <div className="px-4 h-14 flex items-center justify-between">
                    {/* Left: Tabs */}
                    <TabsList className="h-9 bg-transparent p-0">
                        <TabsTrigger
                            value="text-segmentation"
                            className="h-9 data-[state=active]:bg-muted data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4 text-sm font-medium"
                        >
                            Step 1: Text Segmentation
                        </TabsTrigger>
                        <TabsTrigger
                            value="mapping"
                            className="h-9 data-[state=active]:bg-muted data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4 text-sm font-medium"
                        >
                            Step 2: Audio Mapping
                        </TabsTrigger>
                        <TabsTrigger
                            value="preview"
                            className="h-9 data-[state=active]:bg-muted data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4 text-sm font-medium"
                        >
                            Step 3: Preview
                        </TabsTrigger>
                    </TabsList>

                    {/* Right: Actions (Status + Publish + Mode Toggle) */}
                    <div className="flex items-center gap-3">
                        {/* Preview Tab Controls */}
                        {activeTab === 'preview' && (
                            <>
                                {/* Audio File Selector */}
                                {audioFiles.length > 0 && (
                                    <div className="flex items-center">
                                        <Select
                                            value={selectedAudioFileId?.toString() || ''}
                                            onValueChange={(value) => onAudioFileChange?.(parseInt(value))}
                                        >
                                            <SelectTrigger className="h-8 w-48 text-xs border-0 shadow-none bg-transparent hover:bg-accent focus:ring-2 focus:ring-ring px-2 gap-2 text-muted-foreground hover:text-foreground transition-colors">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Music className="h-3.5 w-3.5 opacity-70" />
                                                    <SelectValue placeholder="Select audio" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="text-xs">
                                                {audioFiles.map((file) => (
                                                    <SelectItem key={file.id} value={file.id.toString()}>
                                                        {file.displayName || file.filename}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="h-4 w-px bg-border mx-1" />
                                    </div>
                                )}

                                {/* Audio Player Controls (minimal) */}
                                {selectedAudioFileId && (
                                    <>
                                        <AudioPlayerControls
                                            variant="minimal"
                                            isPlaying={isPlaying}
                                            currentTime={currentTime}
                                            duration={duration}
                                            onPlay={onPlay}
                                            onPause={onPause}
                                            onSeek={onSeek}
                                            showSkipButtons={false}
                                            showPlaybackRate={true}
                                            className="w-72 border-0 shadow-none bg-transparent p-0 gap-2"
                                        />
                                        <div className="h-4 w-px bg-border mx-1" />
                                    </>
                                )}

                                {/* Learn Mode Toggle */}
                                <div className="flex items-center gap-2 px-2">
                                    <span className="text-xs font-medium text-muted-foreground">Learn Mode:</span>
                                    <Switch
                                        checked={learnMode}
                                        onCheckedChange={onLearnModeChange}
                                    />
                                </div>

                                <div className="h-4 w-px bg-border mx-1" />
                            </>
                        )}

                        {/* Mode Toggle (Only visible on Step 5) */}
                        {activeTab === 'text-segmentation' && (
                            <div className="flex items-center bg-muted p-1 rounded-md h-9 mr-4 ring-1 ring-inset ring-border">
                                <button
                                    onClick={() => onTextSegModeChange('editor')}
                                    className={`
                                        flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-semibold transition-all
                                        ${textSegMode === 'editor'
                                            ? 'bg-background text-primary shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'}
                                    `}
                                >
                                    <FilePenLine className="h-3.5 w-3.5" />
                                    Editor
                                </button>
                                <button
                                    onClick={() => onTextSegModeChange('segmentation')}
                                    className={`
                                        flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-semibold transition-all
                                        ${textSegMode === 'segmentation'
                                            ? 'bg-background text-primary shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'}
                                    `}
                                >
                                    <Scissors className="h-3.5 w-3.5" />
                                    Segment
                                </button>
                            </div>
                        )}

                        <div className="h-4 w-px bg-border" />

                        <div className="flex items-center gap-2">
                            <span className={isPublished ? "h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "h-2 w-2 rounded-full bg-mantra-base shadow-[0_0_8px_rgba(var(--mantra-base),0.3)]"} />
                            <span className="text-sm font-medium text-muted-foreground">
                                {isPublished ? 'Published' : 'Draft'}
                            </span>
                        </div>

                        <Button
                            variant={isPublished ? 'outline' : 'default'}
                            size="sm"
                            onClick={handlePublishToggle}
                            disabled={isTogglingStatus}
                            className="h-8"
                        >
                            {isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Unpublish confirmation dialog */}
            <AlertDialog open={showUnpublishConfirm} onOpenChange={cancelUnpublish}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unpublish Chapter?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will change the chapter status to "Draft" and it will no longer be
                            visible to students. You can publish it again at any time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelUnpublish}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUnpublish}>
                            Unpublish
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
