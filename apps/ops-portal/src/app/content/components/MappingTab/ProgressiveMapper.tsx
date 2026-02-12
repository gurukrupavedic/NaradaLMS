import React, { useState } from 'react';
import { MappingWarningDialog } from './components/MappingWarningDialog';
import { useMappingControls } from '@shared/hooks/useMappingControls';
import type { TextSegment, AudioMapping, Script, ContentMap } from '@shared/types/text-segmentation';

export interface MappingState {
    audioRef: React.RefObject<HTMLAudioElement>;
    audioUrl: string;
    isPlaying: boolean;
    currentTime: number;
    duration: number;

    mappingSession: 'idle' | 'setup' | 'active' | 'paused';
    activeSegmentId: number | null;
    progressPercentage: number;
    mappedCount: number;
    totalCount: number;

    segments: TextSegment[];
    currentScript: Script;
    content: ContentMap;
    mappings: AudioMapping[];

    togglePlayPause: () => void;
    clearSessionData: () => void;
    seekTo: (time: number) => void;
    startMappingSession: () => void;
    pauseMappingSession: () => void;
    stopMappingSession: () => void;
    resetMappingSession: () => void;
    handleSegmentClick: (segmentId: number) => void;
    handlePlaySegment: (mapping: AudioMapping, event: React.MouseEvent) => void;
    onMappingUpdate: (segmentId: number, mapping: Partial<AudioMapping>) => void;
    onMappingDelete: (segmentId: number) => void;
    onMappingCreate: (mapping: AudioMapping) => void;
    confirmStartSession: (startSegmentId?: number, startTime?: number) => void;
}

interface ProgressiveMapperProps {
    audioUrl: string;
    segments: TextSegment[];
    currentScript: Script;
    content: ContentMap;
    mappings: AudioMapping[];
    selectedAudioFile?: { id: number; filename: string; displayName?: string };
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    togglePlayPause: () => void;
    onMappingCreate: (mapping: AudioMapping) => void;
    onMappingUpdate: (segmentId: number, mapping: Partial<AudioMapping>) => void;
    onMappingDelete: (segmentId: number) => void;
    readOnly?: boolean;
    children: (state: MappingState) => React.ReactNode;
}

export const ProgressiveMapper: React.FC<ProgressiveMapperProps> = ({
    audioUrl,
    segments,
    currentScript,
    content,
    mappings,
    selectedAudioFile,
    currentTime,
    duration,
    isPlaying,
    togglePlayPause,
    onMappingCreate,
    onMappingUpdate,
    onMappingDelete,
    readOnly = false,
    children
}) => {
    const [mappingSession, setMappingSession] = useState<'idle' | 'setup' | 'active' | 'paused'>('idle');
    const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
    const [sessionStartTime, setSessionStartTime] = useState<number>(0);

    const [showWarningDialog, setShowWarningDialog] = useState(false);
    const [pendingMappingCount, setPendingMappingCount] = useState(0);

    const currentScriptSegments = segments;

    // Normalize mappings for internal use (useMappingControls expects segmentId)
    const normalizedMappings = React.useMemo(() => mappings
        .filter(m => m.textSegmentId !== undefined)
        .map(m => ({
            ...m,
            segmentId: m.textSegmentId as number
        })), [mappings]);

    const mappedSegments = currentScriptSegments.filter(s => normalizedMappings.some(m => m.segmentId === s.id));
    const progressPercentage = currentScriptSegments.length > 0 ? (mappedSegments.length / currentScriptSegments.length) * 100 : 0;

    const handleSessionStartRequest = (existingCount: number) => {
        setPendingMappingCount(existingCount);
        setShowWarningDialog(true);
    };

    const {
        handleSegmentClick,
        startMappingSession: baseMappingStart,
        proceedWithSessionStart,
        pauseMappingSession: baseMappingPause,
        stopMappingSession: baseMappingStop,
        resetMappingSession: baseMappingReset,
        clearSessionData: baseClearData,
    } = useMappingControls({
        mappingSession,
        activeSegmentId,
        currentTime,
        sessionStartTime,
        segments: currentScriptSegments,
        mappings: normalizedMappings,
        selectedAudioFileId: selectedAudioFile?.id,
        onMappingCreate: (m) => onMappingCreate({ ...m, textSegmentId: m.segmentId } as AudioMapping),
        onMappingDelete,
        onSessionChange: setMappingSession,
        onActiveSegmentChange: setActiveSegmentId,
        onSessionStartTimeChange: setSessionStartTime,
        onSessionStartRequest: handleSessionStartRequest
    });

    const startMappingSession = () => {
        baseMappingStart();
    };

    const proceedWithMappingSession = (startSegmentId?: number, startTime?: number) => {
        proceedWithSessionStart(startSegmentId, startTime);
        if (!isPlaying) {
            togglePlayPause();
        }
        setShowWarningDialog(false);
    };

    const pauseMappingSession = () => {
        baseMappingPause();
    };

    const stopMappingSession = () => {
        baseMappingStop();
    };

    const resetMappingSession = () => {
        baseMappingReset();
    };

    const clearSessionData = () => {
        baseClearData();
    };

    const mappingState: MappingState = {
        audioRef: { current: null },
        audioUrl,
        isPlaying,
        currentTime,
        duration,
        mappingSession,
        activeSegmentId,
        progressPercentage,
        mappedCount: mappedSegments.length,
        totalCount: currentScriptSegments.length,
        segments: currentScriptSegments,
        currentScript,
        content,
        mappings,
        togglePlayPause,
        seekTo: () => { },
        startMappingSession: () => !readOnly && startMappingSession(),
        pauseMappingSession,
        stopMappingSession,
        resetMappingSession,
        clearSessionData,
        handleSegmentClick: (id) => !readOnly && handleSegmentClick(id),
        handlePlaySegment: () => { },
        onMappingUpdate: (id, m) => !readOnly && onMappingUpdate(id, m),
        onMappingDelete: (id) => !readOnly && onMappingDelete(id),
        onMappingCreate: (m) => !readOnly && onMappingCreate({ ...m, textSegmentId: m.segmentId } as AudioMapping),
        confirmStartSession: proceedWithMappingSession
    };

    return (
        <>
            {children(mappingState)}

            <MappingWarningDialog
                isOpen={showWarningDialog}
                onConfirm={() => proceedWithMappingSession()}
                onCancel={() => setShowWarningDialog(false)}
                existingMappingsCount={pendingMappingCount}
                audioFileName={selectedAudioFile?.displayName || selectedAudioFile?.filename || 'Unknown'}
            />
        </>
    );
};
