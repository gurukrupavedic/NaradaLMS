import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { TiptapEditor } from '@/components/ui/tiptap-editor';
import { SelectableTextPanel } from '../TextSegmentationTab/SelectableTextPanel';
import { useChapterEditor } from '../../context/ChapterEditorContext';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import '@/components/ui/tiptap-editor/styles/index.scss';

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
    const { chapter, chapterId, isPublished } = useChapterEditor();
    const { playSegment, setAudioSource } = useAudioPlayer();

    const [contentScript, setContentScript] = useState<'te' | 'hi' | 'en'>('te');
    const [selectedSegmentId, setSelectedSegmentId] = useState<number | undefined>(undefined);

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

    const scriptOptions = [
        { value: 'te' as const, label: 'Telugu' },
        { value: 'hi' as const, label: 'Devanagari (Hindi)' },
        { value: 'en' as const, label: 'English (IAST)' },
    ];

    // HTML Mode (Learn Mode OFF)
    if (!learnMode) {
        return (
            <div className="h-full flex flex-col">
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
        <div className="h-full flex flex-col">
            {/* Script selector header - Polished height to match Tiptap toolbar */}
            <div className="border border-gray-200 dark:border-gray-800 border-b-0 rounded-t-lg bg-gray-50 dark:bg-gray-900 min-h-[42px] flex items-center justify-center py-1">
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
            </div>

            {/* Segmented text view */}
            <div className="flex-1 min-h-0 border border-gray-200 dark:border-gray-800 rounded-b-lg bg-white dark:bg-black overflow-hidden relative">
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
        </div>
    );
}
