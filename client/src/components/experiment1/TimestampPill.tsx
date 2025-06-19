/**
 * TimestampPill.tsx
 * Musixmatch-inspired timestamp pill with delete, edit, and play controls
 */

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Play, X, Check, X as Cancel } from 'lucide-react';

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
  const [editingField, setEditingField] = useState<'start' | 'end' | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const formatTimeForEdit = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const parseTimeFromEdit = (timeString: string): number => {
    const parts = timeString.split(':');
    if (parts.length !== 2) return -1;
    
    const mins = parseInt(parts[0]);
    const secs = parseFloat(parts[1]);
    
    if (isNaN(mins) || isNaN(secs)) return -1;
    
    return mins * 60 + secs;
  };

  const startEditingTimestamp = (field: 'start' | 'end') => {
    const currentValue = field === 'start' ? startTime : endTime;
    setEditingField(field);
    setEditValue(formatTimeForEdit(currentValue));
  };

  const saveTimestampEdit = () => {
    if (!editingField) return;
    
    const newTime = parseTimeFromEdit(editValue);
    if (newTime >= 0 && newTime <= duration) {
      const updates = editingField === 'start' 
        ? { startTime: newTime }
        : { endTime: newTime };
      
      onTimestampUpdate(segmentId, updates);
    }
    
    setEditingField(null);
    setEditValue('');
  };

  const cancelTimestampEdit = () => {
    setEditingField(null);
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
    <div className="flex items-center bg-white border border-gray-300 rounded-full px-2 py-1 text-xs font-mono min-w-[110px] shadow-sm">
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 mr-1 transition-colors"
        title="Delete mapping"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Timestamp display */}
      <div className="flex-1 flex items-center justify-center gap-1 text-gray-700">
        {/* Start time */}
        {editingField === 'start' ? (
          <div className="flex items-center gap-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-5 w-12 text-xs bg-white border-gray-300 text-gray-700"
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
            onClick={() => startEditingTimestamp('start')}
            className="hover:bg-gray-100 px-1 rounded transition-colors"
          >
            {formatTime(startTime)}
          </button>
        )}

        <span className="text-gray-400">-</span>

        {/* End time */}
        {editingField === 'end' ? (
          <div className="flex items-center gap-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-5 w-12 text-xs bg-white border-gray-300 text-gray-700"
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
            onClick={() => startEditingTimestamp('end')}
            className="hover:bg-gray-100 px-1 rounded transition-colors"
          >
            {formatTime(endTime)}
          </button>
        )}
      </div>

      {/* Play button */}
      <button
        onClick={handlePlay}
        className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-50 text-gray-500 hover:text-blue-600 ml-1 transition-colors"
        title="Play this segment"
      >
        <Play className="h-3 w-3" />
      </button>
    </div>
  );
};