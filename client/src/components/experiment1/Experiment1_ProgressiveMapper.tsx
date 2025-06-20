/**
 * EXPERIMENT 1: Musixmatch-Inspired Audio Mapping
 * 
 * Restructured component using sub-components for better maintainability.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Test intuitive click-when-heard mapping workflow
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AudioPlayerPanel } from './AudioPlayerPanel';
import { SegmentMappingGrid } from './SegmentMappingGrid';
import { useMappingControls } from './MappingControls';
import { useAudioPlayer } from '@shared/hooks/experiment1/useAudioPlayer';
import type { TextSegment, AudioMapping, Language, ContentMap } from '@shared/experiment1-types';
import { filterSegmentsByLanguage } from '@shared/experiment1-utils';

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

export const Experiment1_ProgressiveMapper: React.FC<ProgressiveMapperProps> = ({
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
    startMappingSession,
    pauseMappingSession,
    stopMappingSession,
    resetMappingSession
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