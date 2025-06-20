/**
 * Mapping Controls Hook
 * 
 * Centralized mapping session state management for audio-text mapping workflow.
 * 
 * Created: January 2025
 * Purpose: Centralize mapping session state management
 */

import { useEffect } from 'react';
import type { TextSegment, AudioMapping } from '@shared/types/text-segmentation';

interface MappingControlsProps {
  mappingSession: 'idle' | 'active' | 'paused';
  activeSegmentId: string | null;
  currentTime: number;
  sessionStartTime: number;
  segments: TextSegment[];
  mappings: AudioMapping[];
  onMappingCreate: (mapping: AudioMapping) => void;
  onMappingDelete: (segmentId: string) => void;
  onSessionChange: (session: 'idle' | 'active' | 'paused') => void;
  onActiveSegmentChange: (segmentId: string | null) => void;
  onSessionStartTimeChange: (time: number) => void;
}

export const useMappingControls = ({
  mappingSession,
  activeSegmentId,
  currentTime,
  sessionStartTime,
  segments,
  mappings,
  onMappingCreate,
  onMappingDelete,
  onSessionChange,
  onActiveSegmentChange,
  onSessionStartTimeChange
}: MappingControlsProps) => {

  const handleSegmentClick = (segmentId: string) => {
    if (mappingSession !== 'active') return;

    // End previous segment if exists
    if (activeSegmentId && activeSegmentId !== segmentId) {
      handleSegmentEnd();
    }

    // Start new segment
    onActiveSegmentChange(segmentId);
    onSessionStartTimeChange(currentTime);
  };

  const handleSegmentEnd = () => {
    if (!activeSegmentId) return;

    const mapping: AudioMapping = {
      segmentId: activeSegmentId,
      startTime: sessionStartTime,
      endTime: currentTime
    };

    onMappingCreate(mapping);
    onActiveSegmentChange(null);
  };

  const startMappingSession = () => {
    onSessionChange('active');
    onActiveSegmentChange(null);
    onSessionStartTimeChange(currentTime);
    
    // Clear existing mappings for current language
    segments.forEach(segment => {
      if (mappings.some(m => m.segmentId === segment.id)) {
        onMappingDelete(segment.id);
      }
    });
  };

  const pauseMappingSession = () => {
    if (mappingSession === 'active') {
      onSessionChange('paused');
    } else if (mappingSession === 'paused') {
      onSessionChange('active');
    }
  };

  const stopMappingSession = () => {
    // End active segment if exists
    if (activeSegmentId) {
      handleSegmentEnd();
    }
    
    onSessionChange('idle');
    onActiveSegmentChange(null);
  };

  const resetMappingSession = () => {
    onSessionChange('idle');
    onActiveSegmentChange(null);
    
    // Clear all mappings for current language segments
    segments.forEach(segment => {
      if (mappings.some(m => m.segmentId === segment.id)) {
        onMappingDelete(segment.id);
      }
    });
  };

  return {
    handleSegmentClick,
    handleSegmentEnd,
    startMappingSession,
    pauseMappingSession,
    stopMappingSession,
    resetMappingSession
  };
};