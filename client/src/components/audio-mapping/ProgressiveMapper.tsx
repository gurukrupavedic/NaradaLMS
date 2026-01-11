/**
 * Progressive Mapper Component
 * 
 * Provides state management and handlers for audio-text mapping workflow.
 * Uses render props pattern to allow parent component to control layout.
 * 
 * Created: January 2025
 * Purpose: Audio-text mapping session logic and state management
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MappingWarningDialog } from '@/components/ui/mapping-warning-dialog';
import { useMappingControls } from '@shared/hooks/useMappingControls';
import { useAudioPlayer } from '@shared/hooks/useAudioPlayer';
import type { TextSegment, AudioMapping, Script, ContentMap } from '@shared/types/text-segmentation';

export interface MappingState {
  // Audio player state
  audioRef: React.RefObject<HTMLAudioElement>;
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  // Mapping session state
  mappingSession: 'idle' | 'setup' | 'active' | 'paused';
  activeSegmentId: number | null;
  progressPercentage: number;
  mappedCount: number;
  totalCount: number;

  // Data needed by child components
  segments: TextSegment[];
  currentScript: Script;
  content: ContentMap;
  mappings: AudioMapping[];

  // Handlers
  togglePlayPause: () => void;
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
  currentTime: number;  // Audio player current time from shared context
  duration: number;      // Audio duration from shared context
  isPlaying: boolean;    // Audio player playing state from shared context
  togglePlayPause: () => void; // Audio player toggle function
  onMappingCreate: (mapping: AudioMapping) => void;
  onMappingUpdate: (segmentId: number, mapping: Partial<AudioMapping>) => void;
  onMappingDelete: (segmentId: number) => void;
  children: (state: MappingState) => React.ReactNode;
}

export const ProgressiveMapper: React.FC<ProgressiveMapperProps> = ({
  audioUrl,
  segments,
  currentScript,
  content,
  mappings,
  selectedAudioFile,
  currentTime,   // Receive from parent
  duration,      // Receive from parent
  isPlaying,     // Receive from parent
  togglePlayPause, // Receive from parent
  onMappingCreate,
  onMappingUpdate,
  onMappingDelete,
  children
}) => {
  // Note: audioRef, isPlaying, togglePlayPause, etc. are handled by AudioFileManager
  // This component only manages the mapping SESSION state

  // Mapping session state
  const [mappingSession, setMappingSession] = useState<'idle' | 'setup' | 'active' | 'paused'>('idle');
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // Warning dialog state
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingMappingCount, setPendingMappingCount] = useState(0);

  // Filter segments by current script
  const currentScriptSegments = segments; // Already script-specific from API

  // Calculate progress (audio file specific)
  const mappedSegments = currentScriptSegments.filter(s => mappings.some(m => m.segmentId === s.id));
  const progressPercentage = currentScriptSegments.length > 0 ? (mappedSegments.length / currentScriptSegments.length) * 100 : 0;

  // Handle session start request with warning
  const handleSessionStartRequest = (existingCount: number) => {
    setPendingMappingCount(existingCount);
    setShowWarningDialog(true);
  };

  // Mapping control logic
  const {
    handleSegmentClick,
    startMappingSession: baseMappingStart,
    proceedWithSessionStart,
    pauseMappingSession: baseMappingPause,
    stopMappingSession: baseMappingStop,
    resetMappingSession: baseMappingReset
  } = useMappingControls({
    mappingSession,
    activeSegmentId,
    currentTime,
    sessionStartTime,
    segments: currentScriptSegments,
    mappings,
    selectedAudioFileId: selectedAudioFile?.id,
    onMappingCreate,
    onMappingDelete,
    onSessionChange: setMappingSession,
    onActiveSegmentChange: setActiveSegmentId,
    onSessionStartTimeChange: setSessionStartTime,
    onSessionStartRequest: handleSessionStartRequest
  });

  // Enhanced mapping controls with audio integration
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
    // Audio control moved to parent (MappingTab)
  };

  const stopMappingSession = () => {
    baseMappingStop();
    // Audio control moved to parent (MappingTab)
  };

  const resetMappingSession = () => {
    baseMappingReset();
    // Audio control moved to parent (MappingTab)
  };

  // Play specific segment (only used internally for preview, not exposed to children)
  // Children should use AudioFileManager's controls directly

  // Prepare state object for render props
  const mappingState: MappingState = {
    audioRef: { current: null },  // Dummy ref, actual audio controlled by AudioFileManager
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
    seekTo: () => { },            // No-op - AudioFileManager controls playback  
    startMappingSession,
    pauseMappingSession,
    stopMappingSession,
    resetMappingSession,
    handleSegmentClick,
    handlePlaySegment: () => { },  // No-op - not needed in new design
    onMappingUpdate,
    onMappingDelete,
    onMappingCreate,
    confirmStartSession: proceedWithMappingSession
  };

  return (
    <>
      {children(mappingState)}

      {/* Warning Dialog */}
      <MappingWarningDialog
        isOpen={showWarningDialog}
        onConfirm={proceedWithMappingSession}
        onCancel={() => setShowWarningDialog(false)}
        existingMappingsCount={pendingMappingCount}
        audioFileName={selectedAudioFile?.displayName || selectedAudioFile?.filename || 'Unknown'}
      />
    </>
  );
};