import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { List, Zap, Music, Play, Pause, Square, RotateCcw } from 'lucide-react';
import { AudioPlayerControls } from '@/new-ui/components/AudioPlayerControls';
import { ProgressiveMapper } from '@/components/audio-mapping/ProgressiveMapper';
import { SegmentMappingGrid } from '@/components/audio-mapping/SegmentMappingGrid';
import { MappingSegmentCard } from '@/components/design-system/MappingSegmentCard';
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
    const { chapter, chapterId, isPublished } = useChapterEditor();
    const { audioFiles } = useAudioManagement(chapterId);
    const { scriptSegments, allChapterMappings, textSegments } = useTextSegmentationEditor();
    const { createMapping, updateMapping, deleteMapping } = useAudioMapping();
    const audioPlayer = useAudioPlayer();

    // Local state
    const [selectedScript, setSelectedScript] = useState<Script>('te');
    const [selectedAudioFileId, setSelectedAudioFileId] = useState<number | null>(null);

    // Panel size persistence
    const [panelSizes, setPanelSizes] = useLocalStorage('mapping-panel-sizes', {
        audio: 35,
        segments: 65,
    });

    const handleLayoutChange = (sizes: number[]) => {
        if (sizes.length === 2) {
            setPanelSizes({ audio: sizes[0], segments: sizes[1] });
        }
    };

    // Auto-select first audio file
    // Auto-select first audio file
    useEffect(() => {
        if (audioFiles.length > 0 && !selectedAudioFileId) {
            setSelectedAudioFileId(audioFiles[0].id);
            audioPlayer.setAudioSource(`/uploads/${audioFiles[0].filename}`);
        }
    }, [audioFiles, selectedAudioFileId]);

    // Get selected audio file
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
    const handleAudioFileChange = useCallback((fileId: string) => {
        const id = parseInt(fileId);
        const file = audioFiles.find(f => f.id === id);
        if (file) {
            setSelectedAudioFileId(id);
            audioPlayer.setAudioSource(`/uploads/${file.filename}`);
        }
    }, [audioFiles, audioPlayer]);



    // No audio files - show 2-column empty state layout
    if (audioFiles.length === 0) {
        return (
            <div className="h-full">
                <ResizablePanelGroup
                    direction="horizontal"
                    onLayout={handleLayoutChange}
                    className="h-full gap-4"
                >
                    {/* Left Panel: Empty state message */}
                    <ResizablePanel
                        defaultSize={panelSizes.audio}
                        minSize={25}
                        maxSize={50}
                        className="bg-white border rounded-lg overflow-hidden flex flex-col"
                    >
                        <div className="p-4 h-full flex flex-col items-center justify-center text-center">
                            <Music className="w-16 h-16 mb-4 text-muted-foreground opacity-20" />
                            <p className="text-sm font-medium text-gray-900 mb-2">No Audio Files</p>
                            <p className="text-xs text-muted-foreground text-balance px-4">
                                Upload audio files in the <span className="font-medium">Media</span> tab to start mapping segments to audio
                            </p>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right Panel: Segment Grid (read-only) */}
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

                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <List className="h-3 w-3" />
                                        {currentScriptSegments.length} segments
                                    </Badge>
                                    <Badge variant="secondary" className="flex items-center gap-1 opacity-50">
                                        <Zap className="h-3 w-3" />
                                        0 mapped
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Segment List (read-only view) */}
                        <div className="flex-1 overflow-auto p-6">
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
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        );
    }

    return (
        <div className="h-full">
            <ProgressiveMapper
                audioUrl={selectedAudioFile ? `/uploads/${selectedAudioFile.filename}` : ''}
                segments={currentScriptSegments}
                currentScript={selectedScript}
                content={chapter?.content || {}}
                mappings={audioFileMappings}
                selectedAudioFile={selectedAudioFile}
                onMappingCreate={(mapping) => {
                    createMapping({
                        textSegmentId: mapping.segmentId,
                        audioFileId: selectedAudioFileId!,
                        startTime: mapping.startTime,
                        endTime: mapping.endTime,
                    });
                }}
                onMappingUpdate={(segmentId, updates) => {
                    updateMapping(segmentId, {
                        startTime: updates.startTime,
                        endTime: updates.endTime,
                    });
                }}
                onMappingDelete={(segmentId) => {
                    deleteMapping(selectedAudioFileId!, segmentId);
                }}
            >
                {(state) => (
                    <ResizablePanelGroup
                        direction="horizontal"
                        onLayout={handleLayoutChange}
                        className="h-full gap-4"
                    >
                        {/* Left Panel: Audio Controls */}
                        <ResizablePanel
                            defaultSize={panelSizes.audio}
                            minSize={25}
                            maxSize={50}
                            className="bg-white border rounded-lg overflow-hidden flex flex-col"
                        >
                            <div className="p-4 space-y-4 flex-1 overflow-auto">
                                {audioFiles.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed">
                                        <Music className="w-12 h-12 mb-4 text-muted-foreground opacity-20" />
                                        <p className="text-sm font-medium text-gray-900">No Audio Files</p>
                                        <p className="text-xs text-muted-foreground mt-1 text-balance">
                                            Upload audio files in the Media tab to start mapping
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Audio File Selector */}
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-2 block">
                                                Audio File
                                            </label>
                                            <Select
                                                value={selectedAudioFileId?.toString() || ''}
                                                onValueChange={handleAudioFileChange}
                                                disabled={isPublished}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select audio file" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {audioFiles.map((file) => (
                                                        <SelectItem key={file.id} value={file.id.toString()}>
                                                            {file.displayName || file.filename}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Audio Player Controls */}
                                        {selectedAudioFile && (
                                            <AudioPlayerControls
                                                title={selectedAudioFile.displayName || selectedAudioFile.filename}
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
                                            />
                                        )}

                                        {/* Session Controls */}
                                        <div className="space-y-2 pt-4 border-t">
                                            <p className="text-xs font-medium text-gray-700 mb-2">Mapping Session</p>
                                            {state.mappingSession === 'idle' ? (
                                                <Button
                                                    onClick={state.startMappingSession}
                                                    className="w-full"
                                                    disabled={isPublished}
                                                >
                                                    Start Mapping Session
                                                </Button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={state.pauseMappingSession}
                                                        className="w-full justify-start"
                                                        disabled={isPublished}
                                                    >
                                                        <div className="flex items-center w-full">
                                                            {state.mappingSession === 'paused' ? (
                                                                <>
                                                                    <Play className="h-4 w-4 mr-2" />
                                                                    Resume Session
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Pause className="h-4 w-4 mr-2" />
                                                                    Pause Session
                                                                </>
                                                            )}
                                                        </div>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={state.stopMappingSession}
                                                        className="w-full justify-start"
                                                        disabled={isPublished}
                                                    >
                                                        <Square className="h-4 w-4 mr-2" />
                                                        End Session
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={state.resetMappingSession}
                                                        className="w-full justify-start"
                                                        disabled={isPublished}
                                                    >
                                                        <RotateCcw className="h-4 w-4 mr-2" />
                                                        Reset
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Instructions for active session */}
                                        {state.mappingSession === 'active' && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-sm text-blue-700">
                                                    <strong>How to map:</strong> Click each segment card when you hear it in the audio.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* Right Panel: Segment Grid */}
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

                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <List className="h-3 w-3" />
                                            {currentScriptSegments.length} segments
                                        </Badge>
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <Zap className="h-3 w-3" />
                                            {mappedCount} mapped
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0">
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
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                )}
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
