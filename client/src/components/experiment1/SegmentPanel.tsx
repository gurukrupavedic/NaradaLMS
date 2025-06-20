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
import type { TextSegment, AudioMapping, Language, ContentMap } from '@shared/experiment1-types';
import { getSegmentText, filterSegmentsByLanguage, getSegmentMapping, getLanguageLabel, formatTime } from '@shared/experiment1-utils';

interface SegmentPanelProps {
  segments: TextSegment[];
  mappings: AudioMapping[];
  currentLanguage: Language;
  content: ContentMap;
  currentSegmentId?: string;
  onSegmentSelect: (segmentId: string) => void;
  onSegmentDelete: (segmentId: string) => void;
  onSegmentUpdate: (id: string, updates: Partial<TextSegment>) => void;
  onPlayMapping: (mapping: AudioMapping) => void;
  onSegmentReorder: (segments: TextSegment[]) => void;
}

export const SegmentPanel: React.FC<SegmentPanelProps> = ({
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
  const currentLanguageSegments = filterSegmentsByLanguage(segments, currentLanguage);

  // Count mapped segments
  const mappedCount = currentLanguageSegments.filter(segment => 
    getSegmentMapping(segment.id, mappings)
  ).length;

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



  return (
    <div className="h-full">
      {/* Content Area */}
      <div className="pb-4 h-full">
        {/* White Container with integrated header */}
        <div className="bg-white rounded-lg border shadow-sm h-[600px] overflow-auto">
          {/* Header - now inside content container and sticky */}
          <div className="sticky top-0 z-10 px-6 py-3 bg-gray-50 border-b">
            <h2 className="text-base font-semibold text-gray-700">Segments ({getLanguageLabel(currentLanguage)})</h2>
          </div>

          {/* Segment Content */}
          <div className="p-4">
            <div className="space-y-3">
              {currentLanguageSegments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                      <Circle className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">+</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Create Your First Segment</h3>
                  <p className="text-gray-600 text-center max-w-xs leading-relaxed mb-4">
                    Select any text in the content area to create segments that can be mapped to audio.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-xs">
                    <p className="text-blue-700 text-sm text-center">
                      <strong>Tip:</strong> Drag to select multiple words or lines of text
                    </p>
                  </div>
                </div>
              ) : (
                currentLanguageSegments.map((segment, index) => {
                  const mapping = getSegmentMapping(segment.id, mappings);
                  const isSelected = segment.id === currentSegmentId;

                  const isDragging = draggedIndex === index;
                  const isDraggedOver = draggedOver === index;
                  const segmentText = getSegmentText(segment, content, currentLanguage, false);

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
                        relative p-3 border rounded-lg cursor-pointer transition-all
                        ${isSelected ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'}
                        ${isDragging ? 'opacity-50' : ''}
                        ${isDraggedOver ? 'border-blue-400 bg-blue-50' : ''}
                      `}
                      onClick={() => onSegmentSelect(segment.id)}
                    >
                      {/* Main Content Layout */}
                      <div className="flex items-start gap-3">
                        {/* Left: Drag Handle */}
                        <div className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        
                        {/* Center: Number Badge */}
                        <Badge variant="secondary" className="text-xs px-2 py-1 min-w-6 justify-center flex-shrink-0 rounded-full bg-gray-200 text-gray-700">
                          {segment.order + 1}
                        </Badge>
                        
                        {/* Right: Content Area */}
                        <div className="flex-1 min-w-0">
                          {/* Text Content */}
                          <div className="text-sm text-gray-700 leading-relaxed break-words">
                            {segmentText}
                          </div>
                        </div>

                        {/* Far Right: Delete Button */}
                        <div className="flex-shrink-0">
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
      </div>
    </div>
  );
};