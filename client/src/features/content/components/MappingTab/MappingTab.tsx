import { useState, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '@/features/shared/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { StretchHorizontal, Zap, RotateCcw } from 'lucide-react';
import { AudioFileManager } from '@/features/content/components/AudioFileManager';
import { ProgressiveMapper } from './ProgressiveMapper';
import { SegmentMappingGrid } from './SegmentMappingGrid';
import { FocusMappingView } from './FocusMappingView';
import { SegmentCard } from '@/features/content/components/SegmentCard';
import { FocusSessionSetup, SessionConfig } from './FocusSessionSetup';
import { useChapterEditor } from '@/features/content/context/ChapterEditorContext';
import { useAudioPlayer } from '@/features/content/context/AudioPlayerContext';
import { useAudioManagement } from '@/features/content/hooks/useAudioManagement';
import { useTextSegmentationEditor } from '@/features/content/hooks/useTextSegmentationEditor';
import { useAudioMapping } from '@/features/content/hooks/useAudioMapping';
import { useLocalStorage } from '@/features/content/hooks/useLocalStorage';
import type { Script } from '@shared/types/text-segmentation';
import { getSegmentText } from '@shared/utils/text-segmentation';

// Type transformation utility
const toSimplifiedMapping = (dbMapping: any) => ({
    segmentId: dbMapping.textSegmentId,
    audioFileId: dbMapping.audioFileId,
    startTime: dbMapping.startTime,
    endTime: dbMapping.endTime,
});

export function MappingTab() {
    const { toast } = useToast();
    const { chapter, chapterId, isPublished } = useChapterEditor();
    const { audioFiles, uploadFile } = useAudioManagement(chapterId);
    const { scriptSegments, allChapterMappings, textSegments } = useTextSegmentationEditor();
    const { createMapping, updateMapping, deleteMapping } = useAudioMapping();
    const audioPlayer = useAudioPlayer();

    // Local state
    const [selectedScript, setSelectedScript] = useState<Script>('te');
    const [selectedAudioFileId, setSelectedAudioFileId] = useState<number | null>(null);

    // Panel size persistence
    const [panelSizes, setPanelSizes] = useLocalStorage('mapping-panel-sizes-v2', {
        audio: 35,
        segments: 65,
    });

    const handleLayoutChange = (sizes: number[]) => {
        if (sizes.length === 2) {
            // visual order is now: [segments, audio]
            setPanelSizes({ segments: sizes[0], audio: sizes[1] });
        }
    };

    // Auto-select first audio file logic
    // We only select if we have files and nothing is selected.
    useEffect(() => {
        if (audioFiles.length > 0 && !selectedAudioFileId) {
            setSelectedAudioFileId(audioFiles[0].id);
            audioPlayer.setAudioSource(`/uploads/${audioFiles[0].filename}`);
        } else if (audioFiles.length === 0 && selectedAudioFileId) {
            // Clear selection if no files remain (e.g. after deletion)
            setSelectedAudioFileId(null);
        }
    }, [audioFiles, selectedAudioFileId, audioPlayer]);

    const selectedAudioFile = useMemo(() =>
        audioFiles.find(f => f.id === selectedAudioFileId),
        [audioFiles, selectedAudioFileId]
    );

    // Filter segments by selected script
    const currentScriptSegments = useMemo(() =>
        textSegments.filter(s => s.script === selectedScript),
        [textSegments, selectedScript]
    );

    // Filter mappings by selected audio file and transform
    const audioFileMappings = useMemo(() =>
        allChapterMappings
            .filter(m => m.audioFileId === selectedAudioFileId)
            .map(toSimplifiedMapping),
        [allChapterMappings, selectedAudioFileId]
    );

    // Calculate mapped count
    const mappedCount = useMemo(() =>
        currentScriptSegments.filter(seg =>
            audioFileMappings.some(m => m.segmentId === seg.id)
        ).length,
        [currentScriptSegments, audioFileMappings]
    );

    // Handler: Change audio file
    const handleAudioFileChange = useCallback((fileId: number) => {
        const file = audioFiles.find(f => f.id === fileId);
        if (file) {
            setSelectedAudioFileId(fileId);
            audioPlayer.setAudioSource(`/uploads/${file.filename}`);
        } else {
            if (fileId === 0) setSelectedAudioFileId(null);
        }
    }, [audioFiles, audioPlayer]);

    return (
        <div className="h-full">
            <ProgressiveMapper
                audioUrl={selectedAudioFile ? `/uploads/${selectedAudioFile.filename}` : ''}
                segments={currentScriptSegments}
                currentScript={selectedScript}
                content={chapter?.content || {}}
                mappings={audioFileMappings}
                selectedAudioFile={selectedAudioFile}
                currentTime={audioPlayer.currentTime}  // Pass from shared context
                duration={audioPlayer.duration}         // Pass from shared context
                isPlaying={audioPlayer.isPlaying}      // Pass from shared context
                togglePlayPause={audioPlayer.togglePlayPause} // Pass from shared context
                readOnly={isPublished}
                onMappingCreate={(mapping) => {
                    createMapping({
                        textSegmentId: mapping.segmentId,
                        audioFileId: selectedAudioFileId!,
                        startTime: mapping.startTime,
                        endTime: mapping.endTime,
                        silent: true
                    });
                }}
                onMappingUpdate={(segmentId, updates) => {
                    updateMapping(selectedAudioFileId!, segmentId, {
                        startTime: updates.startTime,
                        endTime: updates.endTime,
                    });
                }}
                onMappingDelete={(segmentId) => {
                    deleteMapping(selectedAudioFileId!, segmentId);
                }}
            >
                {(state) => {
                    // Scenario 1: Setup Wizard (Explicit Setup Mode OR No Audio Files)
                    if (state.mappingSession === 'setup' || audioFiles.length === 0) {
                        return (
                            <div className="h-full bg-background">
                                <FocusSessionSetup
                                    audioFiles={audioFiles}
                                    segments={currentScriptSegments}
                                    content={chapter?.content || {}}
                                    mappings={audioFileMappings}
                                    selectedAudioId={selectedAudioFileId}
                                    selectedScript={selectedScript}
                                    onAudioChange={handleAudioFileChange}
                                    onScriptChange={setSelectedScript}
                                    onAudioUpload={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'audio/*,video/*';
                                        input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) {
                                                uploadFile(file);
                                            }
                                        };
                                        input.click();
                                    }}
                                    onStartSession={(config: SessionConfig) => {
                                        // 1. Apply config
                                        if (config.startSegmentId !== undefined && config.startSegmentId !== null) {
                                            state.handleSegmentClick(config.startSegmentId);
                                        }
                                        if (config.startTimestamp !== undefined) {
                                            audioPlayer.seek(config.startTimestamp);
                                        }
                                        // 2. Start Session
                                        state.confirmStartSession(config.startSegmentId, config.startTimestamp);
                                        // 3. Play Audio
                                        audioPlayer.play();
                                    }}
                                    onBack={audioFiles.length > 0 ? () => state.resetMappingSession() : undefined}
                                />
                            </div>
                        );
                    }

                    // Scenario 2: Active Focus Mode
                    if (state.mappingSession === 'active' || state.mappingSession === 'paused') {
                        return (
                            <div className="h-full p-1">
                                <FocusMappingView
                                    segments={currentScriptSegments}
                                    currentScript={selectedScript}
                                    content={chapter?.content || {}}
                                    mappings={audioFileMappings}
                                    activeSegmentId={state.activeSegmentId}
                                    currentTime={audioPlayer.currentTime}
                                    duration={audioPlayer.duration}
                                    isPlaying={audioPlayer.isPlaying}
                                    isPaused={state.mappingSession === 'paused'}
                                    onTogglePlayPause={audioPlayer.isPlaying ? audioPlayer.pause : audioPlayer.play}
                                    onPauseSession={() => {
                                        // Current state before toggle
                                        const wasActive = state.mappingSession === 'active';
                                        const wasPaused = state.mappingSession === 'paused';

                                        // Toggle session state
                                        state.pauseMappingSession();

                                        // Handle audio based on PREVIOUS state (since we know the transition)
                                        if (wasActive) {
                                            // Creating pause: Pause audio
                                            audioPlayer.pause();
                                        } else if (wasPaused) {
                                            // Resuming: Play audio
                                            audioPlayer.play();
                                        }
                                    }}
                                    onSeek={audioPlayer.seek}
                                    onStopSession={() => {
                                        state.stopMappingSession();
                                        audioPlayer.pause();
                                        toast({ title: 'Mapping Ended' });
                                    }}
                                    onResetSession={() => {
                                        state.resetMappingSession();
                                        audioPlayer.pause();
                                        audioPlayer.seek(0);
                                    }}
                                    onMarkSegment={() => {
                                        // This is the core "Mark" action
                                        // 1. If there's an active segment, we want to transition to the next one.
                                        if (state.activeSegmentId) {
                                            // Find next segment
                                            const currentIndex = currentScriptSegments.findIndex(s => s.id === state.activeSegmentId);
                                            if (currentIndex >= 0 && currentIndex < currentScriptSegments.length - 1) {
                                                const nextSegment = currentScriptSegments[currentIndex + 1];
                                                // Calling handleSegmentClick with a DIFFERENT ID automatically:
                                                // 1. Ends the current segment (saving mapping)
                                                // 2. Starts the new segment
                                                state.handleSegmentClick(nextSegment.id);
                                            } else {
                                                // End of list - stop session (which also saves the last segment)
                                                state.stopMappingSession();
                                            }
                                        } else {
                                            // If no segment is active (start of session), start the first one
                                            if (currentScriptSegments.length > 0) {
                                                state.handleSegmentClick(currentScriptSegments[0].id);
                                            }
                                        }
                                    }}
                                    onUndoMark={() => {
                                        // Todo: Implement undo
                                    }}
                                />
                            </div>
                        );
                    }

                    // Scenario 3: Split View (Idle)
                    return (
                        <ResizablePanelGroup
                            direction="horizontal"
                            onLayout={handleLayoutChange}
                            className="h-full gap-4"
                        >
                            {/* Left Panel: Segment Grid (Swapped) */}
                            <ResizablePanel
                                defaultSize={panelSizes.segments}
                                minSize={50}
                                maxSize={75}
                                className="bg-card border rounded-lg overflow-hidden flex flex-col"
                            >
                                {/* Header with Script Selector + Stats */}
                                <div className="px-4 h-11 bg-gray-50/50 dark:bg-gray-900/50 border-b flex-shrink-0 flex items-center">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Script</label>
                                            <Select
                                                value={selectedScript}
                                                onValueChange={(value) => setSelectedScript(value as Script)}
                                            >
                                                <SelectTrigger className="w-32 h-7 text-xs bg-background border-input shadow-none">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="te">Telugu</SelectItem>
                                                    <SelectItem value="hi">Devanagari (Hindi)</SelectItem>
                                                    <SelectItem value="en">English (IAST)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex bg-card items-center gap-4">
                                            <Badge variant="secondary" className="flex items-center gap-1 h-6 bg-orange-50 text-orange-700 border-orange-100">
                                                <StretchHorizontal className="h-3 w-3 fill-orange-500 text-orange-600" />
                                                {currentScriptSegments.length} segments
                                            </Badge>
                                            {audioFiles.length > 0 && (
                                                <Badge variant="secondary" className="flex items-center gap-1 h-6">
                                                    <Zap className="h-3 w-3 text-blue-500 fill-current" />
                                                    {mappedCount} mapped
                                                </Badge>
                                            )}
                                            {mappedCount > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={state.clearSessionData}
                                                    className="h-6 text-xs text-muted-foreground hover:text-destructive px-2 ml-2"
                                                >
                                                    <RotateCcw className="h-3 w-3 mr-1" />
                                                    Clear All
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 bg-muted/30">
                                    <SegmentMappingGrid
                                        segments={state.segments}
                                        currentScript={state.currentScript}
                                        content={state.content}
                                        mappings={state.mappings}
                                        mappingSession={state.mappingSession}
                                        activeSegmentId={state.activeSegmentId}
                                        duration={state.duration}
                                        onSegmentClick={state.handleSegmentClick}
                                        onPlaySegment={(mapping) => audioPlayer.playSegment(mapping.startTime, mapping.endTime)}
                                        onMappingUpdate={state.onMappingUpdate}
                                        onMappingDelete={state.onMappingDelete}
                                        onMappingCreate={state.onMappingCreate}
                                        onEndSession={state.stopMappingSession}
                                        hideHeader={true}
                                        readOnly={isPublished}
                                        className="border-0 shadow-none rounded-none bg-transparent"
                                    />
                                </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />

                            {/* Right Panel: Audio Manager & Controls (Swapped) */}
                            <ResizablePanel
                                defaultSize={panelSizes.audio}
                                minSize={25}
                                maxSize={50}
                                className="bg-card border rounded-lg overflow-hidden flex flex-col"
                            >
                                <AudioFileManager
                                    chapterId={chapterId}
                                    selectedAudioFileId={selectedAudioFileId}
                                    onAudioFileChange={handleAudioFileChange}
                                    currentTime={audioPlayer.currentTime}
                                    duration={audioPlayer.duration}
                                    isPlaying={audioPlayer.isPlaying}
                                    volume={audioPlayer.volume}
                                    isMuted={audioPlayer.isMuted}
                                    playbackRate={audioPlayer.playbackRate}
                                    onPlay={audioPlayer.play}
                                    onPause={audioPlayer.pause}
                                    onSeek={audioPlayer.seek}
                                    onVolumeChange={audioPlayer.setVolume}
                                    onMuteToggle={audioPlayer.toggleMute}
                                    onPlaybackRateChange={audioPlayer.setPlaybackRate}
                                    onSkipForward={() => audioPlayer.seek(Math.min(audioPlayer.currentTime + 10, audioPlayer.duration))}
                                    onSkipBackward={() => audioPlayer.seek(Math.max(audioPlayer.currentTime - 10, 0))}
                                    disabled={isPublished}
                                >
                                    {/* Mapping Session Controls Slot */}
                                    {audioFiles.length > 0 && (
                                        <div className="space-y-3 pt-3 mt-3">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Mapping Session
                                            </p>

                                            <Button
                                                onClick={state.startMappingSession}
                                                className="w-full h-11 shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 font-semibold tracking-wide"
                                                disabled={isPublished}
                                            >
                                                START MAPPING
                                            </Button>
                                        </div>
                                    )}
                                </AudioFileManager>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    );
                }}
            </ProgressiveMapper>


        </div>
    );
}
