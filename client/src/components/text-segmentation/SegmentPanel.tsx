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
import type { TextSegment, AudioMapping, Script, ContentMap } from '@shared/types/text-segmentation';
import { getSegmentText, getSegmentsForScript, formatDuration } from '@shared/utils/text-segmentation';

interface SegmentPanelProps {
  segments: TextSegment[];
  mappings: AudioMapping[];
  currentScript: Script;
  content: ContentMap;
  currentSegmentId?: number;
  onSegmentSelect: (segmentId: number | undefined) => void;
  onSegmentDelete: (segmentId: string) => void;
  onSegmentUpdate: (id: string, updates: Partial<TextSegment>) => void;
  onPlayMapping: (mapping: AudioMapping) => void;
  onSegmentReorder: (segments: TextSegment[]) => void;
}

export const SegmentPanel: React.FC<SegmentPanelProps> = ({
  segments,
  mappings,
  currentScript,
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
          onSegmentSelect(undefined); // Clear selection
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentSegmentId, onSegmentSelect]);

  // Filter segments for current script
  const currentScriptSegments = getSegmentsForScript(segments, currentScript);

  // Count mapped segments
  const mappedCount = currentScriptSegments.filter(segment => 
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
    
    const newSegments = [...currentScriptSegments];
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
          <h2 className="text-base font-semibold text-gray-700">
            Segments ({getScriptLabel(currentScript)})
          </h2>
        </div>

        {/* Segments List with Independent Scrolling */}
        <div className="h-[calc(100%-60px)] overflow-y-auto">
          <div className="p-4 space-y-3">
            {currentScriptSegments.length === 0 ? (
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
              currentScriptSegments.map((segment, index) => {
                const mappingStatus = getMappingStatus(segment);
                const mapping = mappings.find(m => m.segmentId === segment.id);
                const isSelected = currentSegmentId === segment.id;
                const isDragging = draggedIndex === index;
                const isDraggedOver = draggedOver === index;
                const segmentText = getSegmentText(segment, content, currentScript, false);

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
                      relative p-3 border rounded-lg cursor-grab transition-all
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
  );
};