/**
 * EXPERIMENT 1: Clean Segment Panel with Integrated Header
 * 
 * Rebuilt from scratch with:
 * - Integrated header with mapping count
 * - Full height responsive layout
 * - Independent scrolling segment cards
 * - Clean drag-and-drop reordering
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Test clean segment management with improved UX
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Trash2, Play, GripVertical, Circle } from 'lucide-react';

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

interface SegmentPanel_v2Props {
  segments: TextSegment[];
  mappings: AudioMapping[];
  currentLanguage: 'te' | 'hi' | 'en';
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  currentSegmentId?: string;
  onSegmentSelect: (segmentId: string) => void;
  onSegmentDelete: (segmentId: string) => void;
  onSegmentUpdate: (id: string, updates: Partial<TextSegment>) => void;
  onPlayMapping: (mapping: AudioMapping) => void;
  onSegmentReorder: (segments: TextSegment[]) => void;
}

export const SegmentPanel: React.FC<SegmentPanel_v2Props> = ({
  segments,
  mappings,
  currentLanguage,
  content,
  currentSegmentId,
  onSegmentSelect,
  onSegmentDelete,
  onSegmentUpdate,
  onPlayMapping,
  onSegmentReorder
}) => {

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedOver, setDraggedOver] = useState<number | null>(null);

  // Filter segments for current language
  const currentLanguageSegments = segments.filter(s => s.textReferences[currentLanguage]);

  // Count mapped segments
  const mappedCount = currentLanguageSegments.filter(segment => 
    mappings.some(mapping => mapping.segmentId === segment.id)
  ).length;

  // Get segment mapping
  const getSegmentMapping = (segmentId: string) => {
    return mappings.find(mapping => mapping.segmentId === segmentId);
  };

  // Get segment text for display
  const getSegmentText = (segment: TextSegment) => {
    const range = segment.textReferences[currentLanguage];
    const text = content[currentLanguage];
    if (!range || !text) return segment.conceptualName;
    
    const segmentText = text.slice(range.start, range.end);
    return segmentText.length > 50 ? segmentText.slice(0, 50) + '...' : segmentText;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOver(index);
  };

  const handleDragLeave = () => {
    setDraggedOver(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDraggedOver(null);
      return;
    }

    const reorderedSegments = [...currentLanguageSegments];
    const [draggedSegment] = reorderedSegments.splice(draggedIndex, 1);
    reorderedSegments.splice(dropIndex, 0, draggedSegment);

    // Update order property
    const updatedSegments = reorderedSegments.map((segment, index) => ({
      ...segment,
      order: index
    }));

    onSegmentReorder(updatedSegments);
    setDraggedIndex(null);
    setDraggedOver(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedOver(null);
  };

  const getLanguageLabel = () => {
    switch (currentLanguage) {
      case 'te': return 'Telugu';
      case 'hi': return 'Hindi';
      case 'en': return 'English';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Integrated Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-muted/30 border-b">
        <h2 className="text-lg font-semibold">Segments ({getLanguageLabel()})</h2>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4">
          {currentLanguageSegments.length === 0 ? (
            <div className="text-center py-12">
              <Circle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No segments created</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Select text in the content area to create your first segment. Segments help organize and map content to audio.
              </p>
            </div>
          ) : (
            currentLanguageSegments.map((segment, index) => {
              const mapping = getSegmentMapping(segment.id);
              const isSelected = segment.id === currentSegmentId;

              const isDragging = draggedIndex === index;
              const isDraggedOver = draggedOver === index;
              const segmentText = getSegmentText(segment);

              return (
                <div
                  key={segment.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    relative p-4 border rounded-lg cursor-pointer transition-all
                    ${isSelected ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'}
                    ${isDragging ? 'opacity-50' : ''}
                    ${isDraggedOver ? 'border-blue-400 bg-blue-50' : ''}
                  `}
                  onClick={() => onSegmentSelect(segment.id)}
                >
                  {/* Drag Handle */}
                  <div className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="ml-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-600">
                            #{segment.order + 1}
                          </span>
                        </div>

                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSegmentDelete(segment.id);
                          }}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>



                    {/* Segment Text Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {segmentText}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Instructions */}
          {currentLanguageSegments.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Tip:</strong> Drag segments to reorder them, click to select, or use the buttons to edit, delete, or play mapped audio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};