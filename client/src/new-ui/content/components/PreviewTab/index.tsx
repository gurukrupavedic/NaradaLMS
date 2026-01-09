import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, FileText, List, Zap } from "lucide-react";

import { SegmentedTextDisplay } from "@/components/text-segmentation/SegmentedTextDisplay";
import { AudioPlayerControls } from "@/new-ui/components/AudioPlayerControls";
import { useChapterEditor } from "../../context/ChapterEditorContext";
import { useAudioPlayer } from "../../context/AudioPlayerContext";

interface TextSegment {
    id: number;
    chapterId: number;
    script: string;
    startPosition: number;
    endPosition: number;
    order: number;
    createdBy: string;
    createdAt: string;
}

interface AudioFile {
    id: number;
    chapterId: number;
    filename: string;
    displayName?: string;
    duration: number;
}

interface AudioTextMapping {
    mappingId: number;
    audioFileId: number;
    textSegmentId: number;
    startTime: number;
    endTime: number;
}

export function PreviewTab() {
    const { chapter, chapterId } = useChapterEditor();
    const {
        isPlaying,
        currentTime,
        duration,
        volume,
        playbackRate,
        isMuted,
        playerRef,
        play,
        pause,
        seek,
        setVolume,
        setPlaybackRate,
        toggleMute,
        setAudioSource,
        playSegment
    } = useAudioPlayer();

    // State management
    const [contentScript, setContentScript] = useState<"te" | "hi" | "en">("te");
    const [selectedAudioFileId, setSelectedAudioFileId] = useState<number | null>(null);
    const [selectedSegmentId, setSelectedSegmentId] = useState<number | undefined>(undefined);
    const [learnMode, setLearnMode] = useState<boolean>(() => {
        const stored = localStorage.getItem("preview-learn-mode");
        return stored ? JSON.parse(stored) : true;
    });

    // Sync learnMode to localStorage
    useEffect(() => {
        localStorage.setItem("preview-learn-mode", JSON.stringify(learnMode));
    }, [learnMode]);

    // Queries
    const { data: textSegments = [] } = useQuery<TextSegment[]>({
        queryKey: [`/api/segments/${chapterId}/${contentScript}`],
        enabled: !!chapterId && !!contentScript,
    });

    const { data: audioFiles = [] } = useQuery<AudioFile[]>({
        queryKey: [`/api/audio-files/${chapterId}`],
        enabled: !!chapterId,
    });

    const { data: mappings = [] } = useQuery<AudioTextMapping[]>({
        queryKey: [`/api/segment-mappings/${chapterId}`],
        enabled: !!chapterId,
    });

    // Auto-select first audio file
    useEffect(() => {
        if (audioFiles.length > 0 && !selectedAudioFileId && playerRef.current) {
            setSelectedAudioFileId(audioFiles[0].id);
            setAudioSource(`/uploads/${audioFiles[0].filename}`);
        }
    }, [audioFiles, selectedAudioFileId, setAudioSource, playerRef]);

    // Segment click handler
    const handleSegmentClick = useCallback((segmentId: number | undefined) => {
        if (!segmentId) {
            setSelectedSegmentId(undefined);
            return;
        }

        setSelectedSegmentId(segmentId);

        // Priority: selected audio file first, then fallback to any other mapping
        const mapping = mappings.find((m) =>
            m.textSegmentId === segmentId && m.audioFileId === selectedAudioFileId
        ) || mappings.find((m) => m.textSegmentId === segmentId);

        if (!mapping) return;

        if (selectedAudioFileId !== mapping.audioFileId) {
            const audioFile = audioFiles.find((f) => f.id === mapping.audioFileId);
            if (audioFile) {
                // Switch file first, then play segment
                setAudioSource(`/uploads/${audioFile.filename}`).then(() => {
                    setSelectedAudioFileId(mapping.audioFileId);
                    // Slight delay to ensure metadata loaded if needed, or rely on playSegment logic
                    // For now, simple chained call
                    setTimeout(() => playSegment(mapping.startTime, mapping.endTime), 50);
                });
            }
        } else {
            playSegment(mapping.startTime, mapping.endTime);
        }
    }, [mappings, selectedAudioFileId, audioFiles, setAudioSource, playSegment]);

    // Derived data
    const chapterContent = chapter?.content || {};
    const currentScriptSegments = textSegments.filter((s) => s.script === contentScript);
    const mappedSegments = currentScriptSegments.filter((segment) =>
        mappings.some(
            (m) => m.textSegmentId === segment.id && m.audioFileId === selectedAudioFileId
        )
    );

    const scriptOptions = [
        { value: "te" as const, label: "Telugu" },
        { value: "hi" as const, label: "Devanagari (Hindi)" },
        { value: "en" as const, label: "English (IAST)" },
    ];

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-3 h-full gap-4">
            {/* Section 1: Text Content Area */}
            <div className="lg:col-span-2 flex-1 min-h-0 flex flex-col border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-black overflow-hidden">
                <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Script</span>
                            <Select
                                value={contentScript}
                                onValueChange={(value) => setContentScript(value as typeof contentScript)}
                            >
                                <SelectTrigger className="h-8 w-40 text-xs bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <SelectValue placeholder="Script" />
                                </SelectTrigger>
                                <SelectContent className="text-sm">
                                    {scriptOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {learnMode && (
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <List className="h-3 w-3" />
                                    {currentScriptSegments.length} segments
                                </Badge>
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    {mappedSegments.length} mapped
                                </Badge>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Learn Mode:</span>
                        <Switch
                            checked={learnMode}
                            onCheckedChange={setLearnMode}
                            className="border border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-700"
                            data-testid="toggle-learn-mode"
                        />
                    </div>
                </div>
                <div
                    className="flex-1 min-h-0 overflow-auto p-6"
                >
                    {chapterContent[contentScript] ? (
                        learnMode ? (
                            <SegmentedTextDisplay
                                content={chapterContent}
                                currentScript={contentScript}
                                segments={textSegments}
                                selectedSegmentId={selectedSegmentId}
                                onSegmentClick={handleSegmentClick}
                                mode="preview"
                                className=""
                            />
                        ) : (
                            <div
                                className={`prose max-w-none ${contentScript === "te"
                                    ? "font-telugu"
                                    : contentScript === "hi"
                                        ? "font-devanagari"
                                        : "font-iast"
                                    }`}
                                style={{ lineHeight: "1.6" }}
                                dangerouslySetInnerHTML={{ __html: chapterContent[contentScript] || "" }}
                                data-testid="html-content-view"
                            />
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <FileText className="w-12 h-12 mb-4 opacity-50" />
                            <p>No content available for this script</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2: Audio Player Panel */}
            <div className="lg:col-span-1 flex flex-col gap-4 flex-shrink-0">
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-black p-3 lg:sticky lg:top-0">
                    <div className="flex items-center gap-2 mb-3">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Audio File:</label>
                        <Select
                            value={selectedAudioFileId?.toString() || ""}
                            onValueChange={(value) => {
                                const audioFileId = parseInt(value);
                                const audioFile = audioFiles.find((f) => f.id === audioFileId);
                                if (audioFile) {
                                    setAudioSource(`/uploads/${audioFile.filename}`);
                                    setSelectedAudioFileId(audioFileId);
                                }
                            }}
                        >
                            <SelectTrigger className="h-8 text-sm" data-testid="select-audio-file">
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

                    {selectedAudioFileId ? (
                        <AudioPlayerControls
                            title={
                                audioFiles.find((f) => f.id === selectedAudioFileId)?.displayName ||
                                audioFiles.find((f) => f.id === selectedAudioFileId)?.filename ||
                                "Audio File"
                            }
                            currentTime={currentTime}
                            duration={duration}
                            isPlaying={isPlaying}
                            volume={volume}
                            isMuted={isMuted}
                            playbackRate={playbackRate}
                            onPlay={play}
                            onPause={pause}
                            onSeek={seek}
                            onVolumeChange={setVolume}
                            onMuteToggle={toggleMute}
                            onPlaybackRateChange={setPlaybackRate}
                            onSkipForward={() => seek(Math.min(currentTime + 10, duration))}
                            onSkipBackward={() => seek(Math.max(currentTime - 10, 0))}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/40">
                            <Music className="w-10 h-10 mb-3 opacity-60" />
                            <p className="text-sm">Select an audio file to preview</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
