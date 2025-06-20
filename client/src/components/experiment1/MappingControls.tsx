/**
 * EXPERIMENT 1: Mapping Controls Hook
 * 
 * Extracted from ProgressiveMapper to handle session state management
 * and control flow for the mapping workflow.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Separate session control logic from UI rendering
 */

import { useCallback } from 'react';
import type { TextSegment, AudioMapping } from '@shared/experiment1-types';

interface UseMappingControlsParams {
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
}: UseMappingControlsParams) => {
  
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

  const handleSegmentClick = useCallback((segmentId: string) => {
    if (mappingSession !== 'active') return;

    // End previous segment if exists
    if (activeSegmentId && activeSegmentId !== segmentId) {
      handleSegmentEnd();
    }

    // Start new segment
    onActiveSegmentChange(segmentId);
  }, [mappingSession, activeSegmentId, handleSegmentEnd, onActiveSegmentChange]);

  const startMappingSession = useCallback(() => {
    onSessionChange('active');
    onActiveSegmentChange(null);
    onSessionStartTimeChange(currentTime);
    
    // Clear existing mappings for current language
    segments.forEach(segment => {
      if (mappings.some(m => m.segmentId === segment.id)) {
        onMappingDelete(segment.id);
      }
    });
  }, [currentTime, segments, mappings, onSessionChange, onActiveSegmentChange, onSessionStartTimeChange, onMappingDelete]);

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
    
    // Clear all mappings for current language segments
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
    pauseMappingSession,
    stopMappingSession,
    resetMappingSession
  };
};