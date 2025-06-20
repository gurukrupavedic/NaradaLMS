/**
 * Timestamp Pill - Production Component
 * 
 * Displays and manages audio timestamps for mapped segments
 * Provides play functionality and editing capabilities
 * 
 * Status: Production Ready
 * Migrated: January 2025
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Edit2, Trash2 } from 'lucide-react';

const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0 || !isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

interface TimestampPillProps {
  segmentId: string;
  startTime: number;
  endTime: number;
  duration: number;
  onPlay: (event: React.MouseEvent) => void;
  onUpdate: (segmentId: string, mapping: Partial<{ startTime: number; endTime: number }>) => void;
  onDelete: () => void;
}

export const TimestampPill: React.FC<TimestampPillProps> = ({
  segmentId,
  startTime,
  endTime,
  duration,
  onPlay,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editStart, setEditStart] = useState(formatTime(startTime));
  const [editEnd, setEditEnd] = useState(formatTime(endTime));

  const handleSave = () => {
    // Parse times and validate
    const [startMin, startSec] = editStart.split(':').map(Number);
    const [endMin, endSec] = editEnd.split(':').map(Number);
    
    if (isNaN(startMin) || isNaN(startSec) || isNaN(endMin) || isNaN(endSec)) {
      return; // Invalid format
    }
    
    const newStartTime = startMin * 60 + startSec;
    const newEndTime = endMin * 60 + endSec;
    
    if (newStartTime >= newEndTime || newEndTime > duration) {
      return; // Invalid range
    }
    
    onUpdate(segmentId, { startTime: newStartTime, endTime: newEndTime });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditStart(formatTime(startTime));
    setEditEnd(formatTime(endTime));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-white border rounded-lg shadow-sm">
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
            className="w-12 text-xs text-center border rounded px-1"
            placeholder="0:00"
          />
          <input
            type="text"
            value={editEnd}
            onChange={(e) => setEditEnd(e.target.value)}
            className="w-12 text-xs text-center border rounded px-1"
            placeholder="0:00"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Button size="sm" onClick={handleSave} className="h-5 px-2 text-xs">
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} className="h-5 px-2 text-xs">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 transition-colors">
      <Button
        size="sm"
        variant="ghost"
        onClick={onPlay}
        className="h-6 w-6 p-0 hover:bg-green-300"
      >
        <Play className="w-3 h-3" />
      </Button>
      
      <div className="text-xs font-mono text-green-800">
        <div>{formatTime(startTime)}</div>
        <div>{formatTime(endTime)}</div>
      </div>
      
      <div className="flex flex-col gap-0.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-3 w-4 p-0 hover:bg-green-300"
        >
          <Edit2 className="w-2 h-2" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="h-3 w-4 p-0 hover:bg-red-300"
        >
          <Trash2 className="w-2 h-2" />
        </Button>
      </div>
    </div>
  );
};

export default TimestampPill;