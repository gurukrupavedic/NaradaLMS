import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Badge,
    cn
} from '@narada/ui';
import { StretchHorizontal, Zap, Maximize, Minimize } from 'lucide-react';
import { apiRequest } from '@/lib/api';

import { SelectableTextPanel } from '../TextSegmentationTab/SelectableTextPanel';
import { useChapterEditor } from '@/lib/content/context/ChapterEditorContext';
import { useAudioPlayer } from '@/lib/content/context/AudioPlayerContext';

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

    const { data: textSegments = [] } = useQuery<TextSegment[]>({
        queryKey: [`/content/chapters/${chapterId}/segments/${contentScript}`],
        queryFn: () => apiRequest<TextSegment[]>(`/content/chapters/${chapterId}/segments/${contentScript}`, { method: 'GET' }),
        enabled: !!chapterId && learnMode,
    });

    const { data: audioFiles = [] } = useQuery<Array<{ id: number; filename: string; displayName?: string }>>({
        queryKey: [`/content/chapters/${chapterId}/audio`],
        queryFn: () => apiRequest<Array<{ id: number; filename: string; displayName?: string }>>(`/content/chapters/${chapterId}/audio`, { method: 'GET' }),
        enabled: !!chapterId,
    });

    const { data: mappings = [] } = useQuery<AudioTextMapping[]>({
        queryKey: [`/content/chapters/${chapterId}/mappings`],
        queryFn: () => apiRequest<AudioTextMapping[]>(`/content/chapters/${chapterId}/mappings`, { method: 'GET' }),
        enabled: !!chapterId && learnMode,
    });

    useEffect(() => {
        if (audioFiles.length > 0 && !selectedAudioFileId) {
            onAudioFileChange(audioFiles[0].id);
            setAudioSource(`/uploads/${audioFiles[0].filename}`);
        }
    }, [audioFiles, selectedAudioFileId, onAudioFileChange, setAudioSource]);

    useEffect(() => {
        if (selectedAudioFileId) {
            const audioFile = audioFiles.find(f => f.id === selectedAudioFileId);
            if (audioFile) {
                setAudioSource(`/uploads/${audioFile.filename}`);
            }
        }
    }, [selectedAudioFileId, audioFiles, setAudioSource]);

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

    if (!learnMode) {
        return (
            <div className={cn("h-full flex flex-col bg-background", { "fixed inset-0 z-50 p-6": isFullScreen })}>
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Script:</span>
                        <Select
                            value={contentScript}
                            onValueChange={(value) => setContentScript(value as typeof contentScript)}
                        >
                            <SelectTrigger className="h-7 w-40 text-xs bg-background border border-border">
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
                    <button
                        onClick={toggleFullScreen}
                        className="text-muted-foreground hover:text-foreground p-1"
                        title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-6">
                    <div
                        className="text-lg leading-relaxed whitespace-pre-wrap max-w-4xl mx-auto"
                        style={{
                            fontFamily: contentScript === 'te' ? "'JIMS', 'Noto Sans Telugu', sans-serif" :
                                contentScript === 'hi' ? "'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif" :
                                    "'AdishilaSan', 'Noto Sans', sans-serif"
                        }}
                    >
                        {chapter?.content?.[contentScript] || 'No content available.'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("h-full flex flex-col bg-background", { "fixed inset-0 z-50": isFullScreen })}>
            <div className="border border-border border-b-0 rounded-t-lg bg-muted min-h-[2.75rem] flex items-center justify-center gap-6 px-4 py-0.5 relative">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Script:</span>
                    <Select
                        value={contentScript}
                        onValueChange={(value) => setContentScript(value as typeof contentScript)}
                    >
                        <SelectTrigger className="h-7 w-40 text-xs bg-background border border-border">
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
                <button
                    onClick={toggleFullScreen}
                    className="absolute right-4 text-muted-foreground hover:text-foreground p-1"
                    title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                    {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>
            </div>

            <div className="flex-1 min-h-0 border border-border bg-card overflow-hidden relative rounded-b-lg">
                {chapter?.content?.[contentScript] ? (
                    <SelectableTextPanel
                        content={chapter.content}
                        script={contentScript}
                        segments={textSegments}
                        selectedSegmentId={selectedSegmentId}
                        onSegmentSelect={handleSegmentClick}
                        onCreateSegment={() => { }}
                        disabled={true}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No content available for this script</p>
                    </div>
                )}
            </div>
        </div>
    );
}
