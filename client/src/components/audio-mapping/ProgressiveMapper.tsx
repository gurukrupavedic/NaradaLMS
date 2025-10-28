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
  mappingSession: 'idle' | 'active' | 'paused';
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
}

interface ProgressiveMapperProps {
  audioUrl: string;
  segments: TextSegment[];
  currentScript: Script;
  content: ContentMap;
  mappings: AudioMapping[];
  selectedAudioFile?: { id: number; filename: string; displayName?: string };
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
  onMappingCreate,
  onMappingUpdate,
  onMappingDelete,
  children
}) => {
  // Audio player hook
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    seekTo,
    playSegment
  } = useAudioPlayer(audioUrl);
  
  // Mapping session state
  const [mappingSession, setMappingSession] = useState<'idle' | 'active' | 'paused'>('idle');
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

  const proceedWithMappingSession = () => {
    proceedWithSessionStart();
    if (!isPlaying) {
      togglePlayPause();
    }
    setShowWarningDialog(false);
  };

  const pauseMappingSession = () => {
    baseMappingPause();
    if (mappingSession === 'active' && isPlaying) {
      togglePlayPause();
    } else if (mappingSession === 'paused' && !isPlaying) {
      togglePlayPause();
    }
  };

  const stopMappingSession = () => {
    // Diagnostic logging for END button
    console.log('🔍 END BUTTON - ProgressiveMapper stopMappingSession:');
    console.log('  - Audio Element currentTime:', audioRef.current?.currentTime);
    console.log('  - React State currentTime:', currentTime);
    console.log('  - Time Mismatch?', audioRef.current?.currentTime !== currentTime);
    console.log('  - Active Segment ID:', activeSegmentId);
    console.log('  - Session Start Time:', sessionStartTime);
    
    baseMappingStop();
    if (isPlaying) {
      togglePlayPause();
    }
  };

  const resetMappingSession = () => {
    baseMappingReset();
    seekTo(0);
    if (isPlaying) {
      togglePlayPause();
    }
  };

  // Play specific segment
  const handlePlaySegment = (mapping: AudioMapping, event: React.MouseEvent) => {
    event.stopPropagation();
    playSegment(mapping.startTime, mapping.endTime);
  };

  if (!audioUrl) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No audio file selected. Please upload an audio file to begin mapping.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare state object for render props
  const mappingState: MappingState = {
    audioRef,
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
    seekTo,
    startMappingSession,
    pauseMappingSession,
    stopMappingSession,
    resetMappingSession,
    handleSegmentClick,
    handlePlaySegment,
    onMappingUpdate,
    onMappingDelete,
    onMappingCreate
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