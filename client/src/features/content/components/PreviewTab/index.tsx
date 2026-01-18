import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StretchHorizontal, Zap } from 'lucide-react';

import { TiptapEditor } from '@/components/ui/tiptap-editor';
import { SelectableTextPanel } from '../TextSegmentationTab/SelectableTextPanel';
import { useChapterEditor } from '../../context/ChapterEditorContext';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import '@/components/ui/tiptap-editor/styles/index.scss';
import { cn } from '@/lib/utils';

interface PreviewTabProps {
    learnMode: boolean;
    selectedAudioFileId: number | null;
    onAudioFileChange: (id: number) => void;
}

interface TextSegment {
    id: number;
    chapterId: number;
    script: string;
    startPosition: number;
    endPosition: number;
    order: number;
}

interface AudioTextMapping {
    mappingId: number;
    audioFileId: number;
    textSegmentId: number;
    startTime: number;
    endTime: number;
}

export function PreviewTab({ learnMode, selectedAudioFileId, onAudioFileChange }: PreviewTabProps) {
    const { chapter, chapterId } = useChapterEditor();
    const { playSegment, setAudioSource } = useAudioPlayer();

    const [contentScript, setContentScript] = useState<'te' | 'hi' | 'en'>('te');
    const [selectedSegmentId, setSelectedSegmentId] = useState<number | undefined>(undefined);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Fetch data for Segmented mode
    const { data: textSegments = [] } = useQuery<TextSegment[]>({
        queryKey: [`/api/segments/${chapterId}/${contentScript}`],
        enabled: !!chapterId && learnMode,
    });

    const { data: audioFiles = [] } = useQuery<Array<{ id: number; filename: string; displayName?: string }>>({
        queryKey: [`/api/audio-files/${chapterId}`],
        enabled: !!chapterId,
    });

    const { data: mappings = [] } = useQuery<AudioTextMapping[]>({
        queryKey: [`/api/segment-mappings/${chapterId}`],
        enabled: !!chapterId && learnMode,
    });

    // Auto-select first audio file when it loads
    useEffect(() => {
        if (audioFiles.length > 0 && !selectedAudioFileId) {
            onAudioFileChange(audioFiles[0].id);
            setAudioSource(`/uploads/${audioFiles[0].filename}`);
        }
    }, [audioFiles, selectedAudioFileId, onAudioFileChange, setAudioSource]);

    // Update audio source when selected file changes
    useEffect(() => {
        if (selectedAudioFileId) {
            const audioFile = audioFiles.find(f => f.id === selectedAudioFileId);
            if (audioFile) {
                setAudioSource(`/uploads/${audioFile.filename}`);
            }
        }
    }, [selectedAudioFileId, audioFiles, setAudioSource]);

    // Handle segment click in Segmented mode
    const handleSegmentClick = useCallback((segmentId: number | undefined) => {
        if (segmentId === undefined) {
            setSelectedSegmentId(undefined);
            return;
        }
        const mapping = mappings.find(m => m.textSegmentId === segmentId);
        if (mapping) {
            playSegment(mapping.startTime, mapping.endTime);
            setSelectedSegmentId(segmentId);
        }
    }, [mappings, playSegment]);

    // Calculate mapped count
    const mappedCount = useMemo(() => {
        if (!selectedAudioFileId || !mappings.length) return 0;
        const currentAudioMappings = mappings.filter(m => m.audioFileId === selectedAudioFileId);
        return textSegments.filter(seg =>
            currentAudioMappings.some(m => m.textSegmentId === seg.id)
        ).length;
    }, [textSegments, mappings, selectedAudioFileId]);

    const scriptOptions = [
        { value: 'te' as const, label: 'Telugu' },
        { value: 'hi' as const, label: 'Devanagari (Hindi)' },
        { value: 'en' as const, label: 'English (IAST)' },
    ];

    const toggleFullScreen = useCallback(() => {
        setIsFullScreen(prev => !prev);
    }, []);

    // HTML Mode (Learn Mode OFF)
    if (!learnMode) {
        return (
            <div className={cn("h-full flex flex-col", { "rte-editor--fullscreen": isFullScreen })}>
                <TiptapEditor
                    content={chapter?.content?.[contentScript] || ''}
                    onChange={() => { }} // No-op (read-only)
                    disabled={true}
                    output="html"
                    language={contentScript}
                    currentScript={contentScript}
                    onScriptChange={setContentScript}
                    className="h-full"
                    maxHeight="100%"
                    minHeight="100%"
                />
            </div>
        );
    }

    // Segmented Mode (Learn Mode ON)
    return (
        <div className={cn("h-full flex flex-col", { "rte-editor--fullscreen": isFullScreen })}>
            {/* Script selector header - Match Tiptap toolbar height (44px / 2.75rem) */}
            <div className="border border-gray-200 dark:border-gray-800 border-b-0 rounded-t-lg bg-gray-50 dark:bg-gray-900 min-h-[2.75rem] flex items-center justify-center gap-6 px-4 py-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Script:</span>
                    <Select
                        value={contentScript}
                        onValueChange={(value) => setContentScript(value as typeof contentScript)}
                    >
                        <SelectTrigger className="h-7 w-40 text-xs bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
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

                <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="flex items-center gap-1 h-6 bg-orange-50 text-orange-700 border-orange-100">
                        <StretchHorizontal className="h-3 w-3 fill-orange-500 text-orange-600" />
                        {textSegments.length} segments
                    </Badge>
                    {audioFiles.length > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1 h-6 bg-blue-50 text-blue-700 border-blue-100">
                            <Zap className="h-3 w-3 fill-blue-500 text-blue-600" />
                            {mappedCount} mapped
                        </Badge>
                    )}
                </div>
            </div>

            {/* Segmented text view */}
            <div className="flex-1 min-h-0 border border-gray-200 dark:border-gray-800 border-b-0 bg-white dark:bg-black overflow-hidden relative">
                {chapter?.content?.[contentScript] ? (
                    <SelectableTextPanel
                        content={chapter.content}
                        script={contentScript}
                        segments={textSegments}
                        selectedSegmentId={selectedSegmentId}
                        onSegmentSelect={handleSegmentClick}
                        onCreateSegment={() => { }} // No-op (read-only)
                        disabled={true} // Read-only mode
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No content available for this script</p>
                    </div>
                )}
            </div>

            {/* StatusBar with fullscreen toggle - Match Tiptap status bar exactly */}
            <div className="rte-status-bar border border-gray-200 dark:border-gray-800 rounded-b-lg">
                <button
                    onClick={toggleFullScreen}
                    aria-label={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                    className="rte-button rte-button--ghost rte-menu__button"
                    title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="rte-button-icon"
                    >
                        {isFullScreen ? (
                            <>
                                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                            </>
                        ) : (
                            <>
                                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                            </>
                        )}
                    </svg>
                    <span className="rte-button__text">Fullscreen</span>
                </button>
            </div>
        </div>
    );
}
