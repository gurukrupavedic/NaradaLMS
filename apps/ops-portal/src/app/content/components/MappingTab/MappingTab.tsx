import { useState } from 'react';
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
import type { Script } from '@shared/types/text-segmentation';

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
    } = useAudioMapping();

    const [panelSizes, setPanelSizes] = useLocalStorage('mapping-tab-panel-sizes', {
        grid: 60,
        audio: 40,
    });

    const handleLayoutChange = (sizes: number[]) => {
        if (sizes.length === 2) {
            setPanelSizes({ grid: sizes[0], audio: sizes[1] });
        }
    };

    return (
        <div className="h-full">
            <ProgressiveMapper
                audioUrl={audioUrl || ''}
                segments={scriptSegments}
                currentScript={selectedScript}
                content={chapter?.content || {}}
                mappings={chapterMappings}
                selectedAudioFile={selectedAudioFile}
                currentTime={audioPlayer.currentTime}
                duration={audioPlayer.duration}
                isPlaying={audioPlayer.isPlaying}
                togglePlayPause={audioPlayer.togglePlayPause}
                onMappingCreate={createMapping}
                onMappingUpdate={(segmentId, mapping) => {
                    const audioFileId = mapping.audioFileId || selectedAudioFileId;
                    if (audioFileId) {
                        updateMapping(audioFileId, segmentId, {
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
                    if (state.mappingSession === 'setup' || (audioFiles?.length > 0 && !selectedAudioFileId)) {
                        return (
                            <FocusSessionSetup
                                audioFiles={audioFiles || []}
                                segments={scriptSegments}
                                content={chapter?.content || {}}
                                mappings={chapterMappings}
                                selectedAudioId={selectedAudioFileId || null}
                                selectedScript={selectedScript}
                                onAudioChange={(id) => setSelectedAudioFileId?.(id)}
                                onScriptChange={setSelectedScript}
                                onAudioUpload={() => {
                                    toast({ title: "Please use the Audio Manager to upload files first." });
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
                                mappings={chapterMappings}
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
                        <ResizablePanelGroup direction="horizontal" onLayout={handleLayoutChange}>
                            <ResizablePanel defaultSize={panelSizes.grid} minSize={30}>
                                <SegmentMappingGrid
                                    segments={scriptSegments}
                                    currentScript={selectedScript}
                                    content={chapter?.content || {}}
                                    mappings={chapterMappings}
                                    mappingSession={state.mappingSession as any}
                                    activeSegmentId={state.activeSegmentId}
                                    duration={audioPlayer.duration}
                                    onSegmentClick={state.handleSegmentClick}
                                    onPlaySegment={(m, e) => {
                                        e.stopPropagation();
                                        audioPlayer.seek(m.startTime);
                                        if (!audioPlayer.isPlaying) audioPlayer.togglePlayPause();
                                    }}
                                    onMappingUpdate={state.onMappingUpdate}
                                    onMappingDelete={state.onMappingDelete}
                                    onMappingCreate={state.onMappingCreate}
                                    onEndSession={state.stopMappingSession}
                                    readOnly={isPublished}
                                />
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={panelSizes.audio} minSize={20}>
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
                                >
                                    <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                                        <h4 className="text-sm font-medium mb-2">Mapping Session</h4>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Mapped Segments:</span>
                                                <span className="font-medium">{state.mappedCount} / {state.totalCount}</span>
                                            </div>
                                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-300"
                                                    style={{ width: `${state.progressPercentage}%` }}
                                                />
                                            </div>
                                            <Button
                                                onClick={state.startMappingSession}
                                                disabled={isPublished || (audioFiles || []).length === 0 || !selectedAudioFileId}
                                                className="w-full mt-2"
                                            >
                                                {state.mappedCount > 0 ? "Continue Mapping" : "Start Mapping Session"}
                                            </Button>
                                        </div>
                                    </div>
                                </AudioFileManager>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    );
                }}
            </ProgressiveMapper>
        </div>
    );
}
