/**
 * Text Segmentation Segment Panel Component
 * 
 * Production implementation of segment panel with integrated header,
 * full height responsive layout, and independent scrolling segment cards.
 * 
 * Created: January 2025
 * Purpose: Clean segment management with improved UX for production use
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Play, Circle, Link, Link2Off } from 'lucide-react';
import { ConnectedCirclesIcon } from '@shared/components/icons';
import type { TextSegment, AudioMapping, Language, ContentMap } from '@shared/types/text-segmentation';
import { getSegmentText, getSegmentsForLanguage, formatDuration } from '@shared/utils/text-segmentation';

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
  const currentLanguageSegments = getSegmentsForLanguage(segments, currentLanguage);

  // Count mapped segments
  const mappedCount = currentLanguageSegments.filter(segment => 
    mappings.some(mapping => mapping.segmentId === segment.id)
  ).length;

  // Get language label
  const getLanguageLabel = (lang: Language): string => {
    switch (lang) {
      case 'te': return 'Telugu';
      case 'hi': return 'Hindi';
      case 'en': return 'English';
      default: return lang;
    }
  };

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

  // Get mapping status for a segment
  const getMappingStatus = (segment: TextSegment): 'mapped' | 'unmapped' | 'broken' => {
    const mapping = mappings.find(m => m.segmentId === segment.id);
    if (!mapping) return 'unmapped';
    
    // Check if mapping has valid timestamps
    if (mapping.startTime >= 0 && mapping.endTime > mapping.startTime) {
      return 'mapped';
    }
    return 'broken';
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
    
    if (draggedIndex === null) return;
    
    const newSegments = [...currentLanguageSegments];
    const draggedSegment = newSegments[draggedIndex];
    
    // Remove from old position
    newSegments.splice(draggedIndex, 1);
    
    // Insert at new position
    const insertIndex = dropIndex > draggedIndex ? dropIndex - 1 : dropIndex;
    newSegments.splice(insertIndex, 0, draggedSegment);
    
    // Update order values
    const updatedSegments = newSegments.map((segment, index) => ({
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
    <div ref={panelRef} className="h-full">
      {/* White Container with integrated header */}
      <div className="bg-white border rounded-lg h-[600px] overflow-hidden shadow-sm">
        {/* Header - sticky and integrated */}
        <div className="sticky top-0 z-10 px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">
              Segments ({getLanguageLabel(currentLanguage)})
            </h2>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">
                {mappedCount}/{currentLanguageSegments.length} mapped
              </Badge>
            </div>
          </div>
        </div>

        {/* Segments List with Independent Scrolling */}
        <div className="h-[calc(100%-60px)] overflow-y-auto">
          <div className="p-4 space-y-3">
            {currentLanguageSegments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No segments found for {getLanguageLabel(currentLanguage)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Create segments by selecting text in the content area
                </p>
              </div>
            ) : (
              currentLanguageSegments.map((segment, index) => {
                const mappingStatus = getMappingStatus(segment);
                const mapping = mappings.find(m => m.segmentId === segment.id);
                const isSelected = selectedSegmentId === segment.id;
                const segmentText = getSegmentText(segment, content, currentLanguage, true, 60);

                return (
                  <div
                    key={segment.id}
                    className={`
                      group relative p-4 border rounded-lg transition-all duration-200 cursor-pointer
                      ${isSelected 
                        ? 'border-blue-300 bg-blue-50 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }
                    `}
                    onClick={() => onSegmentSelect(segment.id)}
                    draggable
                    onDragStart={(e) => {
                      setDraggedIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDraggedOver(index);
                    }}
                    onDragLeave={() => setDraggedOver(null)}
                  >
                    {/* Drag indicator */}
                    {draggedOver === index && draggedIndex !== index && (
                      <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-400 rounded-full"></div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Segment Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <LinkStatusIcon status={mappingStatus} />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {segment.conceptualName}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                          {segmentText}
                        </p>

                        {/* Mapping Info */}
                        {mapping && mappingStatus === 'mapped' && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <Play className="h-3 w-3" />
                            <span>
                              {formatDuration(mapping.startTime)} - {formatDuration(mapping.endTime)}
                            </span>
                            <span className="text-gray-400">
                              ({formatDuration(mapping.endTime - mapping.startTime)})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {mapping && mappingStatus === 'mapped' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePlay(segment);
                            }}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSegmentDelete(segment.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};