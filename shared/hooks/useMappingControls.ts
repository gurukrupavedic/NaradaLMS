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

  // Define handleSegmentEnd first (no dependencies on other local functions)
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

  // Define handleSegmentClick second (depends on handleSegmentEnd)
  const handleSegmentClick = useCallback((segmentId: number) => {
    if (mappingSession !== 'active') return;

    // End previous segment if exists (BEFORE updating sessionStartTime)
    if (activeSegmentId && activeSegmentId !== segmentId) {
      handleSegmentEnd();
      // Now update session start time for the NEW segment
      onSessionStartTimeChange(currentTime);
    } else if (!activeSegmentId) {
      // First segment clicked - just set the start time
      onSessionStartTimeChange(currentTime);
    }

    // Start new segment
    onActiveSegmentChange(segmentId);
  }, [mappingSession, activeSegmentId, currentTime, handleSegmentEnd, onActiveSegmentChange, onSessionStartTimeChange]);

  // Define proceedWithSessionStart first (no dependencies on other local functions)
  const proceedWithSessionStart = useCallback(() => {
    onSessionChange('active');
    onActiveSegmentChange(null);
    onSessionStartTimeChange(currentTime);

    // Clear existing mappings for current audio file only
    segments.forEach(segment => {
      if (mappings.some(m => m.segmentId === segment.id)) {
        onMappingDelete(segment.id);
      }
    });
  }, [currentTime, segments, mappings, onSessionChange, onActiveSegmentChange, onSessionStartTimeChange, onMappingDelete]);

  // Define startMappingSession second (depends on proceedWithSessionStart)
  const startMappingSession = useCallback(() => {
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
  }, [selectedAudioFileId, segments, mappings, onSessionStartRequest, proceedWithSessionStart]);

  const pauseMappingSession = useCallback(() => {
    if (mappingSession === 'active') {
      onSessionChange('paused');
    } else if (mappingSession === 'paused') {
      onSessionChange('active');
    }
  }, [mappingSession, onSessionChange]);

  const stopMappingSession = useCallback(() => {
    // End active segment if exists
    if (activeSegmentId) {
      handleSegmentEnd();
    }

    onSessionChange('idle');
    onActiveSegmentChange(null);
  }, [activeSegmentId, handleSegmentEnd, onSessionChange, onActiveSegmentChange]);

  const resetMappingSession = useCallback(() => {
    onSessionChange('idle');
    onActiveSegmentChange(null);

    // Clear all mappings for current audio file only
    segments.forEach(segment => {
      if (mappings.some(m => m.segmentId === segment.id)) {
        onMappingDelete(segment.id);
      }
    });
  }, [segments, mappings, onSessionChange, onActiveSegmentChange, onMappingDelete]);

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