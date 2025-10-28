/**
 * Mapping Controls Hook
 * 
 * Centralized mapping session state management for audio mapping workflow.
 * 
 * Created: January 2025
 * Purpose: Reusable mapping session logic
 */

import { useCallback } from 'react';
import type { TextSegment, AudioMapping } from '../types/text-segmentation';

interface MappingControlsProps {
  mappingSession: 'idle' | 'active' | 'paused';
  activeSegmentId: number | null;
  currentTime: number;
  sessionStartTime: number;
  segments: TextSegment[];
  mappings: AudioMapping[];
  selectedAudioFileId?: number;
  onMappingCreate: (mapping: AudioMapping) => void;
  onMappingDelete: (segmentId: number) => void;
  onSessionChange: (session: 'idle' | 'active' | 'paused') => void;
  onActiveSegmentChange: (segmentId: number | null) => void;
  onSessionStartTimeChange: (time: number) => void;
  onSessionStartRequest?: (existingCount: number) => void;
}

export const useMappingControls = ({
  mappingSession,
  activeSegmentId,
  currentTime,
  sessionStartTime,
  segments,
  mappings,
  selectedAudioFileId,
  onMappingCreate,
  onMappingDelete,
  onSessionChange,
  onActiveSegmentChange,
  onSessionStartTimeChange,
  onSessionStartRequest
}: MappingControlsProps) => {

  const handleSegmentClick = (segmentId: number) => {
    if (mappingSession !== 'active') return;

    // End previous segment if exists
    if (activeSegmentId && activeSegmentId !== segmentId) {
      handleSegmentEnd();
    }

    // Start new segment
    onActiveSegmentChange(segmentId);
    onSessionStartTimeChange(currentTime);
  };

  const handleSegmentEnd = useCallback(() => {
    if (!activeSegmentId) return;

    const mapping: AudioMapping = {
      segmentId: activeSegmentId,
      startTime: sessionStartTime,
      endTime: currentTime
    };

    onMappingCreate(mapping);
    onActiveSegmentChange(null);
  }, [activeSegmentId, sessionStartTime, currentTime, onMappingCreate, onActiveSegmentChange]);

  const startMappingSession = () => {
    if (!selectedAudioFileId) {
      console.warn('Cannot start mapping session without selected audio file');
      return;
    }

    // Count existing mappings for current audio file
    // Since mappings array now only contains mappings for current audio file,
    // we just need to count segments that have any mapping
    const existingMappingsForAudioFile = segments.filter(segment =>
      mappings.some(m => m.segmentId === segment.id)
    ).length;

    if (existingMappingsForAudioFile > 0 && onSessionStartRequest) {
      // Request confirmation from parent component
      onSessionStartRequest(existingMappingsForAudioFile);
      return;
    }

    // Proceed with session start
    proceedWithSessionStart();
  };

  const proceedWithSessionStart = () => {
    onSessionChange('active');
    onActiveSegmentChange(null);
    onSessionStartTimeChange(currentTime);
    
    // Clear existing mappings for current audio file only
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
    
    // Clear all mappings for current audio file only
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
    proceedWithSessionStart,
    pauseMappingSession,
    stopMappingSession,
    resetMappingSession
  };
};