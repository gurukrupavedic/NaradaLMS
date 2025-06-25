/**
 * Timestamp Pill Component
 * 
 * Musixmatch-inspired timestamp pill with delete, edit, and play controls
 * for audio segment mapping.
 * 
 * Created: January 2025
 * Purpose: Interactive timestamp display and editing
 */

import React, { useState } from 'react';
import { Input } from '@/components/design-system';
import { Play, X, Check, X as Cancel } from 'lucide-react';
import { formatDuration } from '@shared/utils/text-segmentation';

interface TimestampPillProps {
  segmentId: string;
  startTime: number;
  endTime: number;
  onPlay: (startTime: number, endTime: number) => void;
  onDelete: (segmentId: string) => void;
  onTimestampUpdate: (segmentId: string, updates: { startTime?: number; endTime?: number }) => void;
  duration: number;
}

export const TimestampPill: React.FC<TimestampPillProps> = ({
  segmentId,
  startTime,
  endTime,
  onPlay,
  onDelete,
  onTimestampUpdate,
  duration
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');

  const parseTimeFromEdit = (timeString: string): number => {
    const parts = timeString.split(':');
    if (parts.length !== 2) return -1;
    
    const mins = parseInt(parts[0]);
    const secs = parseFloat(parts[1]);
    
    if (isNaN(mins) || isNaN(secs)) return -1;
    
    return mins * 60 + secs;
  };

  const startEditingTimestamp = () => {
    setIsEditing(true);
    setEditValue(formatDuration(endTime, { showDecimal: true }));
  };

  const saveTimestampEdit = () => {
    const newTime = parseTimeFromEdit(editValue);
    if (newTime >= 0 && newTime <= duration) {
      onTimestampUpdate(segmentId, { endTime: newTime });
    }
    
    setIsEditing(false);
    setEditValue('');
  };

  const cancelTimestampEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay(startTime, endTime);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(segmentId);
  };

  return (
    <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium min-w-[85px] shadow-sm hover:border-gray-300 hover:shadow-md transition-all">
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="flex items-center justify-center w-5 h-5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 mr-2 transition-all hover:scale-105"
        title="Delete mapping"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* End timestamp display */}
      <div className="flex-1 flex items-center justify-center text-gray-700">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-5 w-14 text-xs bg-white border-gray-300 text-gray-700"
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTimestampEdit();
                if (e.key === 'Escape') cancelTimestampEdit();
              }}
              autoFocus
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
            className="hover:bg-gray-100 px-2 py-1 rounded transition-colors font-mono"
          >
            {formatDuration(endTime, { showDecimal: true })}
          </button>
        )}
      </div>

      {/* Play button - hidden during editing */}
      {!isEditing && (
        <button
          onClick={handlePlay}
          className="flex items-center justify-center w-5 h-5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 ml-2 transition-all hover:scale-105"
          title="Play this segment"
        >
          <Play className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};