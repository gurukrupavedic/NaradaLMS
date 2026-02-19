import { useState, useEffect, useMemo } from 'react';
import {
    Button,
    Badge,
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
    useToast
} from '@narada/ui';
import { AudioFileManager } from '../AudioFileManager/AudioFileManager';
import { ProgressiveMapper } from './ProgressiveMapper';
import { SegmentMappingGrid } from './SegmentMappingGrid';
import { FocusMappingView } from './FocusMappingView';
import { FocusSessionSetup } from './FocusSessionSetup';
import { useChapterEditor } from '@/lib/content/context/ChapterEditorContext';
import { useAudioPlayer } from '@/lib/content/context/AudioPlayerContext';
import { useAudioManagement } from '@/lib/content/hooks/useAudioManagement';
import { useTextSegmentationEditor } from '@/lib/content/hooks/useTextSegmentationEditor';
import { useAudioMapping } from '@/lib/content/hooks/useAudioMapping';
import { useLocalStorage } from '@/hooks/content/useLocalStorage';
import type { Script } from '@narada/types';

// Type transformation utility
const toSimplifiedMapping = (dbMapping: any) => ({
    segmentId: dbMapping.textSegmentId,
    audioFileId: dbMapping.audioFileId,
    startTime: dbMapping.startTime,
    endTime: dbMapping.endTime,
});

export function MappingTab({
    selectedAudioFileId,
    setSelectedAudioFileId
}: {
    selectedAudioFileId?: number | null;
    setSelectedAudioFileId?: (id: number | null) => void;
}) {
    const { toast } = useToast();
    const { chapter, chapterId, isPublished } = useChapterEditor();
    const audioPlayer = useAudioPlayer();

    const {
        audioFiles,
        uploadFile,
        saveFileName
    } = useAudioManagement(chapterId);

    const selectedAudioFile = audioFiles?.find(f => f.id === selectedAudioFileId);
    const audioUrl = selectedAudioFile ? `/uploads/${selectedAudioFile.filename}` : '';

    const {
        scriptSegments,
        selectedScript,
        setSelectedScript,
        allChapterMappings: chapterMappings,
    } = useTextSegmentationEditor();

    const {
        createMapping,
        updateMapping,
        deleteMapping,
        deleteMultipleMappings,
    } = useAudioMapping();

    // Filter mappings by selected audio file and transform (Parity with Monolith)
    const audioFileMappings = useMemo(() =>
        chapterMappings
            .filter(m => m.audioFileId === selectedAudioFileId)
            .map(toSimplifiedMapping),
        [chapterMappings, selectedAudioFileId]
    );

    const [panelSizes, setPanelSizes] = useLocalStorage('mapping-tab-panel-sizes', {
        grid: 60,
        audio: 40,
    });

    const handleLayoutChange = (sizes: number[]) => {
        if (sizes.length === 2) {
            setPanelSizes({ grid: sizes[0], audio: sizes[1] });
        }
    };

    // Auto-select first audio file logic (Parity with Monolith)
    useEffect(() => {
        if (audioFiles?.length > 0 && !selectedAudioFileId) {
            setSelectedAudioFileId?.(audioFiles[0].id);
        } else if (audioFiles?.length === 0 && selectedAudioFileId) {
            // Clear selection if no files remain (e.g. after deletion)
            setSelectedAudioFileId?.(null);
        }
    }, [audioFiles, selectedAudioFileId, setSelectedAudioFileId]);

    // Sync audio source with player context
    useEffect(() => {
        if (audioUrl) {
            audioPlayer.setAudioSource(audioUrl);
        }
    }, [audioUrl, audioPlayer]);

    return (
        <div className="h-full">
            <ProgressiveMapper
                audioUrl={audioUrl || ''}
                segments={scriptSegments}
                currentScript={selectedScript}
                content={chapter?.content || {}}
                mappings={audioFileMappings}
                selectedAudioFile={selectedAudioFile}
                currentTime={audioPlayer.currentTime}
                duration={audioPlayer.duration}
                isPlaying={audioPlayer.isPlaying}
                togglePlayPause={audioPlayer.togglePlayPause}
                onSeek={audioPlayer.seek}
                onMappingCreate={(mapping) => {
                    if (selectedAudioFileId) {
                        createMapping({
                            textSegmentId: mapping.segmentId,
                            audioFileId: selectedAudioFileId,
                            startTime: mapping.startTime,
                            endTime: mapping.endTime,
                            silent: true
                        });
                    }
                }}
                onMappingUpdate={(segmentId, mapping) => {
                    if (selectedAudioFileId) {
                        updateMapping(selectedAudioFileId, segmentId, {
                            startTime: mapping.startTime,
                            endTime: mapping.endTime
                        });
                    }
                }}
                onMappingDelete={(segmentId) => {
                    if (selectedAudioFileId) {
                        deleteMapping(selectedAudioFileId, segmentId);
                    }
                }}
                readOnly={isPublished}
            >
                {(state) => {
                    if (state.mappingSession === 'setup' || !selectedAudioFileId) {
                        return (
                            <FocusSessionSetup
                                audioFiles={audioFiles || []}
                                segments={scriptSegments}
                                content={chapter?.content || {}}
                                mappings={audioFileMappings}
                                selectedAudioId={selectedAudioFileId || null}
                                selectedScript={selectedScript}
                                onAudioChange={(id) => setSelectedAudioFileId?.(id)}
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
                                onStartSession={({ startSegmentId, startTimestamp }) => {
                                    state.confirmStartSession(startSegmentId, startTimestamp);
                                }}
                                onBack={state.mappingSession === 'setup' ? state.resetMappingSession : undefined}
                            />
                        );
                    }

                    if (state.mappingSession === 'active' || state.mappingSession === 'paused') {
                        return (
                            <FocusMappingView
                                segments={scriptSegments}
                                currentScript={selectedScript}
                                content={chapter?.content || {}}
                                mappings={audioFileMappings}
                                activeSegmentId={state.activeSegmentId}
                                currentTime={audioPlayer.currentTime}
                                duration={audioPlayer.duration}
                                isPlaying={audioPlayer.isPlaying}
                                isPaused={state.mappingSession === 'paused'}
                                onTogglePlayPause={state.togglePlayPause}
                                onPauseSession={state.pauseMappingSession}
                                onSeek={audioPlayer.seek}
                                onStopSession={state.stopMappingSession}
                                onResetSession={state.resetMappingSession}
                                onMarkSegment={() => {
                                    if (state.activeSegmentId) {
                                        state.handleSegmentClick(state.activeSegmentId);
                                        const currentIndex = scriptSegments.findIndex(s => s.id === state.activeSegmentId);
                                        if (currentIndex !== -1 && currentIndex < scriptSegments.length - 1) {
                                            state.handleSegmentClick(scriptSegments[currentIndex + 1].id);
                                        } else {
                                            state.stopMappingSession();
                                        }
                                    }
                                }}
                                onUndoMark={() => {
                                }}
                            />
                        );
                    }

                    return (
                        <div className="h-full bg-muted/20">
                            <ResizablePanelGroup direction="horizontal" onLayout={handleLayoutChange} className="gap-2">
                                <ResizablePanel defaultSize={panelSizes.grid} minSize={30}>
                                    <SegmentMappingGrid
                                        segments={scriptSegments}
                                        currentScript={selectedScript}
                                        content={chapter?.content || {}}
                                        mappings={audioFileMappings}
                                        mappingSession={state.mappingSession as any}
                                        activeSegmentId={state.activeSegmentId}
                                        duration={audioPlayer.duration}
                                        onSegmentClick={state.handleSegmentClick}
                                        onPlaySegment={(m, e) => {
                                            e.stopPropagation();
                                            audioPlayer.playSegment(m.startTime, m.endTime);
                                        }}
                                        onMappingUpdate={state.onMappingUpdate}
                                        onMappingDelete={state.onMappingDelete}
                                        onMappingCreate={state.onMappingCreate}
                                        onEndSession={state.stopMappingSession}
                                        onClearAll={() => {
                                            if (selectedAudioFileId && state.mappings.length > 0) {
                                                const segmentIds = state.mappings.map(m => m.segmentId);
                                                deleteMultipleMappings(selectedAudioFileId, segmentIds);
                                            }
                                        }}
                                        onScriptChange={setSelectedScript}
                                        readOnly={isPublished}
                                    />
                                </ResizablePanel>
                                <ResizableHandle withHandle className="bg-transparent w-2 hover:bg-primary/10 transition-colors rounded-sm" />
                                <ResizablePanel defaultSize={panelSizes.audio} minSize={20}>
                                    <div className="h-full border rounded-lg overflow-hidden bg-card shadow-sm flex flex-col">
                                        <div className="flex-1 overflow-hidden">
                                            <AudioFileManager
                                                chapterId={chapterId}
                                                selectedAudioFileId={selectedAudioFileId || null}
                                                onAudioFileChange={(id) => setSelectedAudioFileId?.(id)}
                                                disabled={state.mappingSession !== 'idle'}
                                                isPlaying={audioPlayer.isPlaying}
                                                duration={audioPlayer.duration}
                                                currentTime={audioPlayer.currentTime}
                                                togglePlayPause={audioPlayer.togglePlayPause}
                                                seek={audioPlayer.seek}
                                                volume={audioPlayer.volume}
                                                onVolumeChange={audioPlayer.setVolume}
                                                isMuted={audioPlayer.isMuted}
                                                toggleMute={audioPlayer.toggleMute}
                                                playbackRate={audioPlayer.playbackRate}
                                                onPlaybackRateChange={audioPlayer.setPlaybackRate}
                                            >
                                                <div className="mt-6 border-t pt-6">
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Mapping Session</h4>
                                                    <div className="flex flex-col gap-4">
                                                        <Button
                                                            onClick={state.startMappingSession}
                                                            disabled={isPublished || (audioFiles || []).length === 0 || !selectedAudioFileId}
                                                            className="w-full h-12 text-base font-bold uppercase tracking-wide bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                                        >
                                                            {state.mappedCount > 0 ? "CONTINUE MAPPING" : "START MAPPING"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </AudioFileManager>
                                        </div>
                                    </div>
                                </ResizablePanel>
                            </ResizablePanelGroup>
                        </div>
                    );

                }}
            </ProgressiveMapper>
        </div>
    );
}
