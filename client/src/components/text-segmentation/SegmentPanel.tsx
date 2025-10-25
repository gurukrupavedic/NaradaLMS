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
import { Circle } from 'lucide-react';
import { TextSegment as TextSegmentCard } from '@/components/design-system/TextSegment';
import { getMappingStatus } from '@shared/utils/mapping-status';
import type { TextSegment, AudioMapping, Script, ContentMap } from '@shared/types/text-segmentation';
import { getSegmentText, getSegmentsForScript, formatDuration } from '@shared/utils/text-segmentation';

interface SegmentPanelProps {
  segments: TextSegment[];
  mappings: AudioMapping[];
  currentScript: Script;
  content: ContentMap;
  currentSegmentId?: number;
  onSegmentSelect: (segmentId: number | undefined) => void;
  onSegmentDelete: (segmentId: number) => void;
  onSegmentUpdate: (id: number, updates: Partial<TextSegment>) => void;
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
  const currentScriptSegments = segments; // Already script-specific from API

  // Count mapped segments
  const mappedCount = currentScriptSegments.filter(segment => 
    mappings.some(mapping => mapping.segmentId === segment.id)
  ).length;

  // Get language label
  const getLanguageLabel = (lang: Script): string => {
    switch (lang) {
      case 'te': return 'Telugu';
      case 'hi': return 'Hindi';
      case 'en': return 'English';
      default: return lang;
    }
  };

  // Get mapping status for a segment - simplified to mapped/unmapped only
  const getSegmentMappingStatus = (segment: TextSegment): 'mapped' | 'unmapped' => {
    return getMappingStatus(segment.id, mappings);
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
      <div className="bg-white border rounded-lg h-full overflow-hidden shadow-sm flex flex-col">
        {/* Header - sticky and integrated */}
        <div className="px-6 py-3 bg-gray-50 border-b flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-700">
            Segments ({currentScript === 'te' ? 'TE' : currentScript === 'hi' ? 'DEV' : 'IAST'})
          </h2>
        </div>

        {/* Segments List with Independent Scrolling */}
        <div className="flex-1 min-h-0 overflow-y-auto">
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
                const mappingStatus = getSegmentMappingStatus(segment);
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
                    className={isDraggedOver ? 'ring-2 ring-blue-400 rounded-lg' : ''}
                  >
                    <TextSegmentCard
                      content={segmentText}
                      script={currentScript}
                      fontSize="28px"
                      segmentNumber={index + 1}
                      isSelected={isSelected}
                      isDragging={isDragging}
                      isMapped={mappingStatus === 'mapped'}
                      onDelete={() => onSegmentDelete(segment.id)}
                      onSelect={() => onSegmentSelect(segment.id)}
                    />
                  </div>
                );
              })
            )}

            {/* Bottom Drop Zone - only visible during drag */}
            {draggedIndex !== null && (
              <div
                onDragOver={(e) => handleDragOver(e, currentScriptSegments.length)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, currentScriptSegments.length)}
                className={`
                  h-12 border-2 border-dashed rounded-lg transition-all
                  ${draggedOver === currentScriptSegments.length 
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
            {currentScriptSegments.length > 0 && (
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