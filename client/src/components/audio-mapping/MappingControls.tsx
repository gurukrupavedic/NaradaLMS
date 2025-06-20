/**
 * Mapping Controls Hook - Production Component
 * 
 * Provides mapping session logic and segment click handling
 * Extracted from ProgressiveMapper for reusability
 * 
 * Status: Production Ready
 * Migrated: January 2025
 */

import { useCallback } from 'react';

// Local types
interface TextSegment {
  id: string;
  conceptualName: string;
  textReferences: {
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  };
  order: number;
}

interface AudioMapping {
  segmentId: string;
  startTime: number;
  endTime: number;
}

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
  
  const handleSegmentClick = useCallback((segmentId: string) => {
    if (mappingSession !== 'active') return;

    // If this is the currently active segment, complete the mapping
    if (activeSegmentId === segmentId) {
      const mapping: AudioMapping = {
        segmentId,
        startTime: sessionStartTime,
        endTime: currentTime
      };
      
      onMappingCreate(mapping);
      onActiveSegmentChange(null);
      return;
    }

    // If another segment is active, complete it first
    if (activeSegmentId) {
      const existingMapping: AudioMapping = {
        segmentId: activeSegmentId,
        startTime: sessionStartTime,
        endTime: currentTime
      };
      onMappingCreate(existingMapping);
    }

    // Start mapping the new segment
    onActiveSegmentChange(segmentId);
    onSessionStartTimeChange(currentTime);
  }, [
    mappingSession,
    activeSegmentId,
    currentTime,
    sessionStartTime,
    onMappingCreate,
    onActiveSegmentChange,
    onSessionStartTimeChange
  ]);

  const startMappingSession = useCallback(() => {
    onSessionChange('active');
    onSessionStartTimeChange(currentTime);
  }, [currentTime, onSessionChange, onSessionStartTimeChange]);

  const pauseMappingSession = useCallback(() => {
    if (mappingSession === 'active') {
      onSessionChange('paused');
    } else if (mappingSession === 'paused') {
      onSessionChange('active');
    }
  }, [mappingSession, onSessionChange]);

  const stopMappingSession = useCallback(() => {
    onSessionChange('idle');
    onActiveSegmentChange(null);
    onSessionStartTimeChange(0);
  }, [onSessionChange, onActiveSegmentChange, onSessionStartTimeChange]);

  const resetMappingSession = useCallback(() => {
    onSessionChange('idle');
    onActiveSegmentChange(null);
    onSessionStartTimeChange(0);
    
    // Clear all mappings
    segments.forEach(segment => {
      if (mappings.some(m => m.segmentId === segment.id)) {
        onMappingDelete(segment.id);
      }
    });
  }, [segments, mappings, onMappingDelete, onSessionChange, onActiveSegmentChange, onSessionStartTimeChange]);

  return {
    handleSegmentClick,
    startMappingSession,
    pauseMappingSession,
    stopMappingSession,
    resetMappingSession
  };
};

export default useMappingControls;