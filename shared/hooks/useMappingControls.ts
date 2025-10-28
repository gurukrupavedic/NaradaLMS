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

    console.log('🔍 END BUTTON - handleSegmentEnd called:');
    console.log('  - Active Segment ID:', activeSegmentId);
    console.log('  - React State sessionStartTime:', sessionStartTime);
    console.log('  - React State currentTime:', currentTime);
    console.log('  - Validation: endTime > startTime?', currentTime > sessionStartTime);
    console.log('  - Difference (seconds):', currentTime - sessionStartTime);

    const mapping: AudioMapping = {
      segmentId: activeSegmentId,
      startTime: sessionStartTime,
      endTime: currentTime
    };

    console.log('  - Mapping object being created:', mapping);

    onMappingCreate(mapping);
    onActiveSegmentChange(null);
  }, [activeSegmentId, sessionStartTime, currentTime, onMappingCreate, onActiveSegmentChange]);

  // Define handleSegmentClick second (depends on handleSegmentEnd)
  const handleSegmentClick = useCallback((segmentId: number) => {
    if (mappingSession !== 'active') return;

    // End previous segment if exists
    if (activeSegmentId && activeSegmentId !== segmentId) {
      handleSegmentEnd();
    }

    // Start new segment
    onActiveSegmentChange(segmentId);
    onSessionStartTimeChange(currentTime);
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