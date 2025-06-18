/**
 * EXPERIMENT 1: Annotation Layer + Progressive Mapping Segmentation
 * 
 * This component provides a side panel for viewing and managing text segments.
 * Shows segment overview, mapping status, and quick navigation.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Test segment management interface for annotation workflow
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Circle, Trash2, Play, GripVertical } from 'lucide-react';

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

interface Experiment1_SegmentPreviewProps {
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
  onPlayMapping: (mapping: AudioMapping) => void;
  onSegmentReorder: (segments: TextSegment[]) => void;
}

export const Experiment1_SegmentPreview: React.FC<Experiment1_SegmentPreviewProps> = ({
  segments,
  mappings,
  currentLanguage,
  content,
  currentSegmentId,
  onSegmentSelect,
  onSegmentDelete,
  onPlayMapping,
  onSegmentReorder
}) => {
  // EXPERIMENT1: Drag and drop state
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [draggedOver, setDraggedOver] = React.useState<number | null>(null);

  // EXPERIMENT1: Helper functions
  const getSegmentText = (segment: TextSegment) => {
    const textContent = content[currentLanguage] || '';
    const range = segment.textReferences[currentLanguage];
    if (!range) return 'No text for this language';
    return textContent.slice(range.start, range.end);
  };

  const getSegmentMapping = (segmentId: string) => {
    return mappings.find(m => m.segmentId === segmentId);
  };

  // EXPERIMENT1: Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedOver(index);
  };

  const handleDragLeave = () => {
    setDraggedOver(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDraggedOver(null);
      return;
    }

    try {
      // Validate indices
      if (draggedIndex < 0 || draggedIndex >= currentLanguageSegments.length ||
          dropIndex < 0 || dropIndex >= currentLanguageSegments.length) {
        console.error('Invalid drag indices:', { draggedIndex, dropIndex, segmentCount: currentLanguageSegments.length });
        setDraggedIndex(null);
        setDraggedOver(null);
        return;
      }

      // Create a new array of current language segments with reordering
      const reorderedSegments = [...currentLanguageSegments];
      const draggedSegment = reorderedSegments[draggedIndex];
      
      if (!draggedSegment) {
        console.error('Dragged segment not found at index:', draggedIndex);
        setDraggedIndex(null);
        setDraggedOver(null);
        return;
      }
      
      // Remove the dragged segment and insert it at the new position
      reorderedSegments.splice(draggedIndex, 1);
      reorderedSegments.splice(dropIndex, 0, draggedSegment);
      
      // Update order properties for the reordered segments
      const reorderedWithNewOrder = reorderedSegments.map((segment, index) => ({
        ...segment,
        order: index + 1
      }));
      
      // Create updated segments array: replace current language segments, keep others unchanged
      const updatedAllSegments = segments.map(segment => {
        if (segment.textReferences[currentLanguage]) {
          // Find this segment in the reordered array
          const reorderedSegment = reorderedWithNewOrder.find(s => s.id === segment.id);
          return reorderedSegment || segment;
        }
        return segment; // Keep other language segments unchanged
      });
      
      onSegmentReorder(updatedAllSegments);
    } catch (error) {
      console.error('Error during drag and drop:', error);
    } finally {
      setDraggedIndex(null);
      setDraggedOver(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // EXPERIMENT1: Filter segments by current language and sort by order
  const currentLanguageSegments = segments
    .filter(segment => segment.textReferences[currentLanguage])
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  const mappedCount = currentLanguageSegments.filter(s => getSegmentMapping(s.id)).length;
  const totalCount = currentLanguageSegments.length;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Segments Overview</span>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            Experiment 1
          </Badge>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {mappedCount} of {totalCount} segments mapped
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px] px-6 pb-6">
          {currentLanguageSegments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No segments created for {currentLanguage.toUpperCase()} yet.</p>
              <p className="text-xs mt-1">Use the annotation layer to create segments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentLanguageSegments.map((segment, index) => {
                const mapping = getSegmentMapping(segment.id);
                const isActive = currentSegmentId === segment.id;
                const segmentText = getSegmentText(segment);
                const isDragging = draggedIndex === index;
                const isDraggedOver = draggedOver === index;
                
                return (
                  <div
                    key={segment.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`border border-gray-200 rounded-lg transition-all cursor-move hover:bg-gray-50 ${
                      isActive 
                        ? 'border-blue-300 bg-blue-50 shadow-sm' 
                        : 'hover:border-gray-300'
                    } ${
                      isDragging ? 'opacity-50 scale-95' : ''
                    } ${
                      isDraggedOver ? 'border-blue-400 bg-blue-25' : ''
                    }`}
                    onClick={() => onSegmentSelect(segment.id)}
                  >
                    {/* EXPERIMENT1: Table-like row layout */}
                    <div className="flex items-center px-4 py-3">
                      {/* Left: Extended drag handle area */}
                      <div className="flex items-center gap-3 cursor-grab active:cursor-grabbing mr-4">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                        <span className="font-medium text-lg text-gray-700 min-w-8">#{index + 1}</span>
                      </div>
                      
                      {/* Middle: Content area */}
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="text-sm text-gray-700 truncate mb-1">
                          {segmentText}
                        </div>
                        {mapping && (
                          <div className="text-xs text-green-600">
                            {formatTime(mapping.startTime)} - {formatTime(mapping.endTime)}
                          </div>
                        )}
                      </div>
                      
                      {/* Right: Status and actions */}
                      <div className="flex items-center gap-3">
                        {/* Mapping status */}
                        <div className="flex-shrink-0">
                          {mapping ? (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mapped
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Circle className="h-3 w-3 mr-1" />
                              Not Mapped
                            </Badge>
                          )}
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex gap-1">
                          {mapping && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPlayMapping(mapping);
                              }}
                              title="Play audio segment"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSegmentDelete(segment.id);
                            }}
                            title="Delete segment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>


                  </div>
                );
              })}
              
              {/* Drop zone at the end for dropping items at the last position */}
              {currentLanguageSegments.length > 0 && (
                <div
                  onDragOver={(e) => handleDragOver(e, currentLanguageSegments.length)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, currentLanguageSegments.length - 1)}
                  className={`h-8 border-2 border-dashed rounded transition-colors ${
                    draggedOver === currentLanguageSegments.length 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                />
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};