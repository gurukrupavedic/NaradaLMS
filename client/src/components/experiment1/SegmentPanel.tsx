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

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Play, Circle, Link, Link2Off } from 'lucide-react';
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
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside to clear selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        if (currentSegmentId) {
          onSegmentSelect(''); // Clear selection
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentSegmentId, onSegmentSelect]);

  // Filter segments for current language
  const currentLanguageSegments = filterSegmentsByLanguage(segments, currentLanguage);

  // Count mapped segments
  const mappedCount = currentLanguageSegments.filter(segment => 
    getSegmentMapping(segment.id, mappings)
  ).length;

  // Connected Circles Icon Component (for mapped state)
  const ConnectedCirclesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" className={className}>
      <path d="M320-200q-117 0-198.5-81.5T40-480q0-117 81.5-198.5T320-760q27 0 52.5 5t49.5 14q-17 14-32 30.5T362-676q-10-2-20.5-3t-21.5-1q-83 0-141.5 58.5T120-480q0 83 58.5 141.5T320-280q11 0 21.5-1t20.5-3q13 18 28 34.5t32 30.5q-24 9-49.5 14t-52.5 5Zm320 0q-27 0-52.5-5T538-219q17-14 32-30.5t28-34.5q11 2 21 3t21 1q83 0 141.5-58.5T840-480q0-83-58.5-141.5T640-680q-11 0-21 1t-21 3q-13-18-28-34.5T538-741q24-9 49.5-14t52.5-5q117 0 198.5 81.5T920-480q0 117-81.5 198.5T640-200Zm-160-50q-57-39-88.5-100T360-480q0-69 31.5-130T480-710q57 39 88.5 100T600-480q0 69-31.5 130T480-250Z" fill="#16a34a"/>
    </svg>
  );

  // Link Status Icon Component
  const LinkStatusIcon: React.FC<{ status: 'mapped' | 'unmapped' | 'broken' }> = ({ status }) => {
    if (status === 'mapped') {
      return <ConnectedCirclesIcon className="h-4 w-4 text-green-600" />;
    }
    if (status === 'broken') {
      return <Link2Off className="h-3 w-3 text-amber-600 opacity-90" />;
    }
    return <Link2Off className="h-3 w-3 text-gray-400 opacity-60" />;
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



  return (
    <div className="h-full" ref={panelRef}>
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
                <div className="py-12 px-6">
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Circle className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Create Text Segments</h3>
                    <p className="text-gray-600 text-sm">Follow these steps to get started</p>
                  </div>

                  <div className="space-y-4 max-w-sm mx-auto">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        1
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Select text</p>
                        <p className="text-xs text-gray-600">Highlight words or sentences in the content area</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        2
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Create segment</p>
                        <p className="text-xs text-gray-600">Segment will appear here automatically</p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        3
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Map to audio</p>
                        <p className="text-xs text-gray-600">Use the Audio & Mapping tab to sync with audio</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                currentLanguageSegments.map((segment, index) => {
                  const mapping = getSegmentMapping(segment.id, mappings);
                  const isSelected = segment.id === currentSegmentId;
                  const mappingStatus = mapping ? 'mapped' : 'unmapped';

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
                        relative p-3 border rounded-lg cursor-grab transition-colors transition-border-colors transition-shadow duration-200
                        ${isSelected ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'}
                        ${isDragging ? 'opacity-50 cursor-grabbing' : ''}
                        ${isDraggedOver ? 'border-blue-400 bg-blue-50' : ''}
                      `}
                      onClick={() => onSegmentSelect(segment.id)}
                    >
                      {/* Main Content Layout */}
                      <div className="flex items-start gap-3">
                        {/* Left: Number Badge */}
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

                        {/* Far Right: Status Icon and Delete Button */}
                        <div className="flex-shrink-0 flex items-center gap-1">
                          <LinkStatusIcon status={mappingStatus} />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSegmentDelete(segment.id);
                            }}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Bottom Drop Zone - only visible during drag */}
              {draggedIndex !== null && (
                <div
                  onDragOver={(e) => handleDragOver(e, currentLanguageSegments.length)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, currentLanguageSegments.length)}
                  className={`
                    h-12 border-2 border-dashed rounded-lg transition-all
                    ${draggedOver === currentLanguageSegments.length 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 bg-gray-50'
                    }
                    flex items-center justify-center
                  `}
                >
                  <span className="text-sm text-gray-500">Drop here to move to end</span>
                </div>
              )}

              {/* Instructions */}
              {currentLanguageSegments.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> Drag segments to reorder
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