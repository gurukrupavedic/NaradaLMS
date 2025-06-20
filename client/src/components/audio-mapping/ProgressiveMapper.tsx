/**
 * Audio Mapping Component
 * 
 * Musixmatch-inspired audio mapping interface with intuitive click-when-heard workflow.
 * Restructured component using sub-components for better maintainability.
 * 
 * Created: January 2025
 * Purpose: Intuitive audio-text mapping workflow
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AudioPlayerPanel } from './AudioPlayerPanel';
import { SegmentMappingGrid } from './SegmentMappingGrid';
import { useMappingControls } from './MappingControls';
import { useAudioPlayer } from '@shared/hooks/useAudioPlayer';
import type { TextSegment, AudioMapping, Language, ContentMap } from '@shared/types/text-segmentation';
import { filterSegmentsByLanguage } from '@shared/utils/text-utils';

interface ProgressiveMapperProps {
  audioUrl: string;
  segments: TextSegment[];
  currentLanguage: Language;
  content: ContentMap;
  mappings: AudioMapping[];
  onMappingCreate: (mapping: AudioMapping) => void;
  onMappingUpdate: (segmentId: string, mapping: Partial<AudioMapping>) => void;
  onMappingDelete: (segmentId: string) => void;
}

export const ProgressiveMapper: React.FC<ProgressiveMapperProps> = ({
  audioUrl,
  segments,
  currentLanguage,
  content,
  mappings,
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
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // Filter segments by current language
  const currentLanguageSegments = filterSegmentsByLanguage(segments, currentLanguage);

  // Calculate progress
  const mappedSegments = currentLanguageSegments.filter(s => mappings.some(m => m.segmentId === s.id));
  const progressPercentage = currentLanguageSegments.length > 0 ? (mappedSegments.length / currentLanguageSegments.length) * 100 : 0;

  // Mapping control logic
  const {
    handleSegmentClick,
    startMappingSession: baseMappingStart,
    pauseMappingSession: baseMappingPause,
    stopMappingSession: baseMappingStop,
    resetMappingSession: baseMappingReset
  } = useMappingControls({
    mappingSession,
    activeSegmentId,
    currentTime,
    sessionStartTime,
    segments: currentLanguageSegments,
    mappings,
    onMappingCreate,
    onMappingDelete,
    onSessionChange: setMappingSession,
    onActiveSegmentChange: setActiveSegmentId,
    onSessionStartTimeChange: setSessionStartTime
  });

  // Enhanced mapping controls with audio integration
  const startMappingSession = () => {
    baseMappingStart();
    if (!isPlaying) {
      togglePlayPause();
    }
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
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)]">
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
          totalCount={currentLanguageSegments.length}
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
          segments={currentLanguageSegments}
          currentLanguage={currentLanguage}
          content={content}
          mappings={mappings}
          mappingSession={mappingSession}
          activeSegmentId={activeSegmentId}
          duration={duration}
          onSegmentClick={handleSegmentClick}
          onPlaySegment={handlePlaySegment}
          onMappingUpdate={onMappingUpdate}
          onMappingDelete={onMappingDelete}
        />
      </div>
    </div>
  );
};