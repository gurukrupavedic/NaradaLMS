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

    const newSegments = [...segments];
    const draggedSegment = newSegments[draggedIndex];
    newSegments.splice(draggedIndex, 1);
    newSegments.splice(dropIndex, 0, draggedSegment);
    
    // Update order property
    const reorderedSegments = newSegments.map((segment, index) => ({
      ...segment,
      order: index + 1
    }));
    
    onSegmentReorder(reorderedSegments);
    setDraggedIndex(null);
    setDraggedOver(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // EXPERIMENT1: Calculate statistics
  const mappedCount = segments.filter(s => getSegmentMapping(s.id)).length;
  const totalCount = segments.length;

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
          {segments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No segments created yet.</p>
              <p className="text-xs mt-1">Use the annotation layer to create segments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {segments.map((segment, index) => {
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
                    className={`p-3 border rounded-lg transition-all cursor-move ${
                      isActive 
                        ? 'border-blue-300 bg-blue-50 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${
                      isDragging ? 'opacity-50 scale-95' : ''
                    } ${
                      isDraggedOver ? 'border-blue-400 bg-blue-25' : ''
                    }`}
                    onClick={() => onSegmentSelect(segment.id)}
                  >
                    {/* EXPERIMENT1: Segment header with drag handle */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {/* Drag handle and order number */}
                        <div className="flex items-center gap-2 text-gray-600">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <h3 className="font-medium text-lg">#{index + 1}</h3>
                        </div>
                        
                        {/* Mapping status */}
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
                      
                      {/* EXPERIMENT1: Action buttons */}
                      <div className="flex gap-1">
                        {mapping && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayMapping(mapping);
                            }}
                            title="Play audio segment"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSegmentDelete(segment.id);
                          }}
                          title="Delete segment"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* EXPERIMENT1: Segment text preview */}
                    <div className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {segmentText}
                    </div>

                    {/* EXPERIMENT1: Mapping info */}
                    {mapping && (
                      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        Audio: {formatTime(mapping.startTime)} - {formatTime(mapping.endTime)}
                        <span className="ml-2 text-gray-500">
                          ({formatTime(mapping.endTime - mapping.startTime)} duration)
                        </span>
                      </div>
                    )}


                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};