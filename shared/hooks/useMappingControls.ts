/**
 * Mapping Controls Hook
 * 
 * Centralized mapping session state management for audio mapping workflow.
 * 
 * Created: January 2025
 * Purpose: Reusable mapping session logic
 */

import { useCallback } from 'react';
import type { AudioMapping } from '../types/text-segmentation';

/** Minimal segment shape used by the hook (id only required). */
interface SegmentWithId {
  id: number;
}

interface MappingControlsProps {
  mappingSession: 'idle' | 'setup' | 'active' | 'paused';
  activeSegmentId: number | null;
  currentTime: number;
  sessionStartTime: number;
  segments: SegmentWithId[];
  mappings: AudioMapping[];
  selectedAudioFileId?: number;
  onMappingCreate: (mapping: AudioMapping) => void;
  onMappingDelete: (segmentId: number) => void;
  onSessionChange: (session: 'idle' | 'setup' | 'active' | 'paused') => void;
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
  onMappingCreate,
  onMappingDelete,
  onSessionChange,
  onActiveSegmentChange,
  onSessionStartTimeChange,
}: MappingControlsProps) => {

  // Define handleSegmentEnd first (no dependencies on other local functions)
  const handleSegmentEnd = useCallback(() => {
    if (!activeSegmentId) return;

    console.log('[DEBUG handleSegmentEnd] Creating mapping:', {
      segmentId: activeSegmentId,
      startTime: sessionStartTime,
      endTime: currentTime,
      isValid: sessionStartTime >= 0 && currentTime > sessionStartTime
    });

    // Validate timestamp range
    if (currentTime <= sessionStartTime) {
      console.warn('[handleSegmentEnd] Invalid timestamp range (endTime <= startTime), skipping mapping:', {
        startTime: sessionStartTime,
        endTime: currentTime
      });
      return;
    }

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
    console.log('[DEBUG handleSegmentClick] Segment clicked:', {
      segmentId,
      currentActiveSegmentId: activeSegmentId,
      currentTime,
      sessionStartTime,
      mappingSession
    });

    if (mappingSession !== 'active') return;

    // End previous segment if exists (BEFORE updating sessionStartTime)
    if (activeSegmentId && activeSegmentId !== segmentId) {
      console.log('[DEBUG] Ending previous segment before starting new one');
      handleSegmentEnd();
      // Now update session start time for the NEW segment
      onSessionStartTimeChange(currentTime);
    } else if (!activeSegmentId) {
      // First segment clicked - just set the start time
      console.log('[DEBUG] First segment - setting session start time');
      onSessionStartTimeChange(currentTime);
    }

    // Start new segment
    onActiveSegmentChange(segmentId);
  }, [mappingSession, activeSegmentId, currentTime, sessionStartTime, handleSegmentEnd, onActiveSegmentChange, onSessionStartTimeChange]);

  // Define proceedWithSessionStart first (no dependencies on other local functions)
  const proceedWithSessionStart = useCallback((startSegmentId?: number, startTime?: number) => {
    onSessionChange('active');
    if (startSegmentId !== undefined) {
      onActiveSegmentChange(startSegmentId);
    } else {
      onActiveSegmentChange(null);
    }
    onSessionStartTimeChange(startTime !== undefined ? startTime : currentTime);

    onSessionStartTimeChange(startTime !== undefined ? startTime : currentTime);

    // [MODIFIED] Removed auto-deletion of existing mappings. 
    // New session should append/merge, not wipe previous work.
  }, [currentTime, onSessionChange, onActiveSegmentChange, onSessionStartTimeChange]);

  // Define startMappingSession second (depends on proceedWithSessionStart)
  const startMappingSession = useCallback(() => {
    // Transition to Setup Wizard
    onSessionChange('setup');
  }, [onSessionChange]);

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
  }, [onSessionChange, onActiveSegmentChange]);

  const clearSessionData = useCallback(() => {
    // Explicitly clear all mappings for current audio file
    segments.forEach(segment => {
      if (mappings.some(m => m.segmentId === segment.id)) {
        onMappingDelete(segment.id);
      }
    });
  }, [segments, mappings, onMappingDelete]);

  return {
    handleSegmentClick,
    handleSegmentEnd,
    startMappingSession,
    proceedWithSessionStart,
    pauseMappingSession,
    stopMappingSession,
    resetMappingSession,
    clearSessionData
  };
};