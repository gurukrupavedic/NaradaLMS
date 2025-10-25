/**
 * Progressive Mapper Component
 * 
 * Musixmatch-inspired audio mapping interface with restructured sub-components
 * for better maintainability and intuitive click-when-heard workflow.
 * 
 * Created: January 2025
 * Purpose: Audio-text mapping with interactive session management
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AudioPlayerPanel } from './AudioPlayerPanel';
import { SegmentMappingGrid } from './SegmentMappingGrid';
import { MappingWarningDialog } from '@/components/ui/mapping-warning-dialog';
import { useMappingControls } from '@shared/hooks/useMappingControls';
import { useAudioPlayer } from '@shared/hooks/useAudioPlayer';
import type { TextSegment, AudioMapping, Script, ContentMap } from '@shared/types/text-segmentation';
import { getSegmentsForScript } from '@shared/utils/text-segmentation';


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
  onMappingDelete
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

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      {/* Left Column: Audio Player Panel */}
      <div className="col-span-4">
        <AudioPlayerPanel
          audioRef={audioRef}
          audioUrl={audioUrl}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          mappingSession={mappingSession}
          progressPercentage={progressPercentage}
          mappedCount={mappedSegments.length}
          totalCount={currentScriptSegments.length}
          togglePlayPause={togglePlayPause}
          seekTo={seekTo}
          startMappingSession={startMappingSession}
          pauseMappingSession={pauseMappingSession}
          stopMappingSession={stopMappingSession}
          resetMappingSession={resetMappingSession}
        />
      </div>

      {/* Right Column: Segment Mapping Grid */}
      <div className="col-span-8">
        <SegmentMappingGrid
          segments={currentScriptSegments}
          currentScript={currentScript}
          content={content}
          mappings={mappings}
          mappingSession={mappingSession}
          activeSegmentId={activeSegmentId}
          duration={duration}
          onSegmentClick={handleSegmentClick}
          onPlaySegment={handlePlaySegment}
          onMappingUpdate={onMappingUpdate}
          onMappingDelete={onMappingDelete}
          onMappingCreate={onMappingCreate}
          onEndSession={stopMappingSession}
        />
      </div>

      {/* Warning Dialog */}
      <MappingWarningDialog
        isOpen={showWarningDialog}
        onConfirm={proceedWithMappingSession}
        onCancel={() => setShowWarningDialog(false)}
        existingMappingsCount={pendingMappingCount}
        audioFileName={selectedAudioFile?.displayName || selectedAudioFile?.filename || 'Unknown'}
      />
    </div>
  );
};