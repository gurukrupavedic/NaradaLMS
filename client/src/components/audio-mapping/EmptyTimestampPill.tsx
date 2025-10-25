/**
 * Empty Timestamp Pill Component
 * 
 * Allows manual entry of timestamps for segments without starting a mapping session.
 * 
 * Created: January 2025
 * Purpose: Manual timestamp entry for unmapped segments
 */

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X as Cancel, Plus } from 'lucide-react';
import { formatDuration } from '@shared/utils/text-segmentation';
import type { AudioMapping } from '@shared/types/text-segmentation';

interface EmptyTimestampPillProps {
  segmentId: number;
  isFirstSegment: boolean;
  previousSegmentEndTime: number;
  isEditing: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  onMappingCreate: (mapping: AudioMapping) => void;
  duration: number;
}

export const EmptyTimestampPill: React.FC<EmptyTimestampPillProps> = ({
  segmentId,
  isFirstSegment,
  previousSegmentEndTime,
  isEditing,
  onEditStart,
  onEditCancel,
  onMappingCreate,
  duration
}) => {
  const [editStartValue, setEditStartValue] = useState<string>('');
  const [editEndValue, setEditEndValue] = useState<string>('');
  const pillRef = useRef<HTMLDivElement>(null);

  const parseTimeFromEdit = (timeString: string): number => {
    const parts = timeString.split(':');
    if (parts.length !== 2) return -1;
    
    const mins = parseInt(parts[0]);
    const secs = parseFloat(parts[1]);
    
    if (isNaN(mins) || isNaN(secs)) return -1;
    
    return mins * 60 + secs;
  };

  const startEditingTimestamp = () => {
    onEditStart();
    
    // Initialize values based on whether it's first segment or not
    if (isFirstSegment) {
      setEditStartValue('0:00.0');
      setEditEndValue('');
    } else {
      // For non-first segments, start time is auto-calculated from previous segment
      setEditStartValue(formatDuration(previousSegmentEndTime, { showDecimal: true }));
      setEditEndValue('');
    }
  };

  const saveTimestampEdit = () => {
    const startTime = isFirstSegment 
      ? parseTimeFromEdit(editStartValue)
      : previousSegmentEndTime;
    const endTime = parseTimeFromEdit(editEndValue);
    
    // Validation
    if (endTime < 0 || endTime > duration) {
      alert('End time must be between 0 and ' + formatDuration(duration, { showDecimal: true }));
      return;
    }
    
    if (startTime < 0 || startTime > duration) {
      alert('Start time must be between 0 and ' + formatDuration(duration, { showDecimal: true }));
      return;
    }
    
    if (startTime >= endTime) {
      alert('Start time must be before end time');
      return;
    }
    
    // Create the mapping
    const mapping: AudioMapping = {
      segmentId,
      startTime,
      endTime
    };
    
    onMappingCreate(mapping);
    onEditCancel();
    setEditStartValue('');
    setEditEndValue('');
  };

  const cancelTimestampEdit = () => {
    onEditCancel();
    setEditStartValue('');
    setEditEndValue('');
  };

  // Click-outside detection to auto-cancel edit mode
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(event.target as Node)) {
        cancelTimestampEdit();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  return (
    <div 
      ref={pillRef}
      className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium w-32 h-10 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
    >
      {isEditing ? (
        <div className="flex items-center gap-1 w-full justify-center">
          {isFirstSegment && (
            <>
              <Input
                value={editStartValue}
                onChange={(e) => setEditStartValue(e.target.value)}
                className="h-5 w-14 text-xs bg-white border-gray-300 text-gray-700"
                placeholder="0:00.0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTimestampEdit();
                  if (e.key === 'Escape') cancelTimestampEdit();
                }}
                autoFocus
              />
              <span className="text-gray-400">-</span>
            </>
          )}
          <Input
            value={editEndValue}
            onChange={(e) => setEditEndValue(e.target.value)}
            className="h-5 w-14 text-xs bg-white border-gray-300 text-gray-700"
            placeholder="0:00.0"
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTimestampEdit();
              if (e.key === 'Escape') cancelTimestampEdit();
            }}
            autoFocus={!isFirstSegment}
          />
          <button onClick={saveTimestampEdit} className="text-blue-600 hover:text-blue-700">
            <Check className="h-3 w-3" />
          </button>
          <button onClick={cancelTimestampEdit} className="text-red-600 hover:text-red-700">
            <Cancel className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button 
          onClick={startEditingTimestamp}
          className="flex items-center justify-center w-full hover:bg-gray-100 px-2 py-1 rounded transition-colors font-mono text-gray-400"
          title="Click to add timestamp"
        >
          <Plus className="h-3 w-3 mr-1" />
          --:--
        </button>
      )}
    </div>
  );
};
