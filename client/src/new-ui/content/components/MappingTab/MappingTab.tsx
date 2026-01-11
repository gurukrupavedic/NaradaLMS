import { useState, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '@/features/shared-features/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { List, Zap, Play, Pause, Square, RotateCcw } from 'lucide-react';
import { AudioFileManager } from '@/new-ui/content/components/AudioFileManager';
import { ProgressiveMapper } from '@/components/audio-mapping/ProgressiveMapper';
import { SegmentMappingGrid } from '@/components/audio-mapping/SegmentMappingGrid';
import { FocusMappingView } from '@/components/audio-mapping/FocusMappingView';
import { MappingSegmentCard } from '@/components/design-system/MappingSegmentCard';
import { FocusSessionSetup, SessionConfig } from '@/components/audio-mapping/FocusSessionSetup';
import { useChapterEditor } from '@/new-ui/content/context/ChapterEditorContext';
import { useAudioPlayer } from '@/new-ui/content/context/AudioPlayerContext';
import { useAudioManagement } from '@/new-ui/content/hooks/useAudioManagement';
import { useTextSegmentationEditor } from '@/new-ui/content/hooks/useTextSegmentationEditor';
import { useAudioMapping } from '@/new-ui/content/hooks/useAudioMapping';
import { useLocalStorage } from '@/new-ui/content/hooks/useLocalStorage';
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
                            <div className="h-full bg-slate-50">
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
                                className="bg-white border rounded-lg overflow-hidden flex flex-col"
                            >
                                {/* Header with Script Selector + Stats */}
                                <div className="px-6 py-3 bg-gray-50 border-b flex-shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <label className="text-xs font-medium text-gray-700">Script</label>
                                            <Select
                                                value={selectedScript}
                                                onValueChange={(value) => setSelectedScript(value as Script)}
                                            >
                                                <SelectTrigger className="w-40 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="te">Telugu</SelectItem>
                                                    <SelectItem value="hi">Devanagari (Hindi)</SelectItem>
                                                    <SelectItem value="en">English (IAST)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex bg-white items-center gap-2">
                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                <List className="h-3 w-3" />
                                                {currentScriptSegments.length} segments
                                            </Badge>
                                            {audioFiles.length > 0 && (
                                                <Badge variant="secondary" className="flex items-center gap-1">
                                                    <Zap className="h-3 w-3" />
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

                                <div className="flex-1 min-h-0 bg-gray-50/30">
                                    {audioFiles.length === 0 ? (
                                        // Read-only view when no audio files
                                        <div className="h-full overflow-auto p-6">
                                            {currentScriptSegments.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                                                    <List className="w-12 h-12 mb-4 opacity-20" />
                                                    <p className="text-sm">No segments for {selectedScript.toUpperCase()}</p>
                                                    <p className="text-xs mt-1">Create segments in the Segmentation tab</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {currentScriptSegments.map((segment, index) => {
                                                        const segmentText = getSegmentText(segment, chapter?.content || {}, selectedScript);
                                                        return (
                                                            <MappingSegmentCard
                                                                key={segment.id}
                                                                content={segmentText}
                                                                segmentNumber={index + 1}
                                                                status="ready"
                                                                script={selectedScript}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Interactive Grid
                                        <SegmentMappingGrid
                                            segments={state.segments}
                                            currentScript={state.currentScript}
                                            content={state.content}
                                            mappings={state.mappings}
                                            mappingSession={state.mappingSession}
                                            activeSegmentId={state.activeSegmentId}
                                            duration={state.duration}
                                            onSegmentClick={state.handleSegmentClick}
                                            onPlaySegment={state.handlePlaySegment}
                                            onMappingUpdate={state.onMappingUpdate}
                                            onMappingDelete={state.onMappingDelete}
                                            onMappingCreate={state.onMappingCreate}
                                            onEndSession={state.stopMappingSession}
                                            hideHeader={true}
                                            className="border-0 shadow-none rounded-none bg-transparent"
                                        />
                                    )}
                                </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />

                            {/* Right Panel: Audio Manager & Controls (Swapped) */}
                            <ResizablePanel
                                defaultSize={panelSizes.audio}
                                minSize={25}
                                maxSize={50}
                                className="bg-white border rounded-lg overflow-hidden flex flex-col"
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
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Mapping Session
                                                </p>
                                                {state.mappingSession === 'active' && (
                                                    <Badge variant="default" className="bg-red-600 hover:bg-red-600 h-5 px-2 text-[10px] animate-pulse">
                                                        ● Live
                                                    </Badge>
                                                )}
                                            </div>

                                            {state.mappingSession === 'idle' ? (
                                                <Button
                                                    onClick={state.startMappingSession}
                                                    className="w-full h-11 shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 font-semibold tracking-wide"
                                                    disabled={isPublished}
                                                >
                                                    START MAPPING
                                                </Button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                const wasActive = state.mappingSession === 'active';
                                                                const wasPaused = state.mappingSession === 'paused';
                                                                state.pauseMappingSession();
                                                                if (wasActive) audioPlayer.pause();
                                                                else if (wasPaused) audioPlayer.play();
                                                            }}
                                                            className="w-full justify-center h-9"
                                                            disabled={isPublished}
                                                        >
                                                            {state.mappingSession === 'paused' ? (
                                                                <>
                                                                    <Play className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                                                                    Resume
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Pause className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                                                                    Pause
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                state.stopMappingSession();
                                                                audioPlayer.pause();
                                                            }}
                                                            className="w-full justify-center h-9 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                            disabled={isPublished}
                                                        >
                                                            <Square className="h-3.5 w-3.5 mr-1.5 fill-current" />
                                                            End
                                                        </Button>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => {
                                                            state.resetMappingSession();
                                                            audioPlayer.pause();
                                                            audioPlayer.seek(0);
                                                        }}
                                                        className="w-full justify-center h-8 text-xs text-muted-foreground hover:text-foreground"
                                                        disabled={isPublished}
                                                    >
                                                        <RotateCcw className="h-3 w-3 mr-1.5" />
                                                        Reset Session
                                                    </Button>
                                                </div>
                                            )}

                                            {state.mappingSession === 'active' && (
                                                <div className="bg-blue-50/50 border border-blue-100 rounded-md p-2.5 text-center">
                                                    <span className="text-xs text-blue-700">
                                                        Click segment cards in the grid before you start hearing them in the audio.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </AudioFileManager>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    );
                }}
            </ProgressiveMapper>

            {/* Published chapter overlay */}
            {isPublished && (
                <div
                    className="absolute inset-0 bg-transparent z-10 cursor-not-allowed"
                    onClick={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    onKeyDown={(e) => e.preventDefault()}
                />
            )}
        </div>
    );
}
