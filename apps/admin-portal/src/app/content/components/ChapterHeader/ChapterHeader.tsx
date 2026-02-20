import React from 'react';
import { Button, Badge, TabsList, TabsTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@narada/ui';
import { FilePenLine, Scissors, Music } from 'lucide-react';
import { AudioPlayerControls } from "@narada/ui";
import { useChapterEditor } from '@/lib/content/context/ChapterEditorContext';
import { useChapterMetadata } from '@/lib/content/hooks/useChapterMetadata';
import { useAudioPlayer } from '@/lib/content/context/AudioPlayerContext';

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
}: ChapterHeaderProps) {
    const { chapter, isLoading } = useChapterEditor();
    const audioPlayer = useAudioPlayer();

    // Destructure audio player state
    const {
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        play: onPlay,
        pause: onPause,
        seek: onSeek,
        setPlaybackRate
    } = audioPlayer;

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
                <div className="min-h-11 h-11 py-2 px-3 sm:px-4 flex items-center">
                    <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-card border-b border-border flex-shrink-0">
                <div className="min-h-11 h-11 py-2 px-3 sm:px-4 flex items-center justify-between gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                    {/* Left: Tabs */}
                    <TabsList className="h-8 bg-transparent p-0 shrink-0">
                        <TabsTrigger
                            value="text-segmentation"
                            className="h-8 data-[state=active]:bg-muted data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-3 sm:px-4 text-sm font-medium"
                        >
                            Step 1: Text Segmentation
                        </TabsTrigger>
                        <TabsTrigger
                            value="mapping"
                            className="h-8 data-[state=active]:bg-muted data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-3 sm:px-4 text-sm font-medium"
                        >
                            Step 2: Audio Mapping
                        </TabsTrigger>
                        <TabsTrigger
                            value="preview"
                            className="h-8 data-[state=active]:bg-muted data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-3 sm:px-4 text-sm font-medium"
                        >
                            Step 3: Preview
                        </TabsTrigger>
                    </TabsList>

                    {/* Right: Actions (Status + Publish + Mode Toggle) */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
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
                                            <SelectTrigger className="h-8 min-w-0 w-40 sm:w-48 text-xs border-0 shadow-none bg-transparent hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring px-2 gap-2 text-muted-foreground hover:text-foreground transition-colors">
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
                                            playbackRate={playbackRate}
                                            onPlay={onPlay}
                                            onPause={onPause}
                                            onSeek={onSeek}
                                            onPlaybackRateChange={setPlaybackRate}
                                            showSkipButtons={false}
                                            showPlaybackRate={true}
                                            className="min-w-0 w-48 sm:w-72 border-0 shadow-none bg-transparent p-0 gap-2"
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

                        {/* Mode Toggle (Only visible on Step 1) */}
                        {activeTab === 'text-segmentation' && (
                            <div className="flex items-center bg-muted p-1 rounded-md h-8 mr-2 sm:mr-4 ring-1 ring-inset ring-border shrink-0">
                                <button
                                    onClick={() => onTextSegModeChange('editor')}
                                    className={`
                                        flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-semibold transition-colors
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
                                        flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-semibold transition-colors
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
                            <span className={isPublished ? "h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "h-2 w-2 rounded-full bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.3)]"} />
                            <span className="text-sm font-medium text-muted-foreground">
                                {isPublished ? 'Published' : 'Draft'}
                            </span>
                        </div>

                        <Button
                            variant={isPublished ? 'outline' : 'default'}
                            size="sm"
                            onClick={handlePublishToggle}
                            disabled={isTogglingStatus}
                            className="h-8 shrink-0"
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
