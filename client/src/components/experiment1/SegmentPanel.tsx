/**
 * EXPERIMENT 1: Segment Management Panel
 * 
 * Dedicated panel for managing text segments in the annotation workflow.
 * Extracted from SegmentPreview to support resizable two-pane layout.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Clean segment management interface for resizable layout
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { CheckCircle, Circle, Trash2, Play, GripVertical, Edit3 } from 'lucide-react';

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

interface SegmentPanelProps {
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
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
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

  // Get segment text
  const getSegmentText = (segment: TextSegment) => {
    const textRef = segment.textReferences[currentLanguage];
    if (!textRef || !content[currentLanguage]) return 'No text available';
    
    return content[currentLanguage]!.slice(textRef.start, textRef.end);
  };

  // Handle segment name editing
  const handleEditStart = (segmentId: string) => {
    setEditingSegment(segmentId);
  };

  const handleEditSave = (segmentId: string, newName: string) => {
    onSegmentUpdate(segmentId, { conceptualName: newName });
    setEditingSegment(null);
  };

  const handleEditCancel = () => {
    setEditingSegment(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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

    const newSegments = [...currentLanguageSegments];
    const draggedSegment = newSegments[draggedIndex];
    
    // Remove from old position
    newSegments.splice(draggedIndex, 1);
    
    // Insert at new position
    newSegments.splice(dropIndex, 0, draggedSegment);
    
    // Update order values
    const updatedSegments = newSegments.map((segment, index) => ({
      ...segment,
      order: index
    }));
    
    onSegmentReorder(updatedSegments);
    
    setDraggedIndex(null);
    setDraggedOver(null);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">
          Segments ({currentLanguage.toUpperCase()})
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {mappedCount} of {currentLanguageSegments.length} segments mapped
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px] px-6 pb-6">
          {currentLanguageSegments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No segments created for {currentLanguage.toUpperCase()} yet.</p>
              <p className="text-xs mt-1">Use the text selection to create segments.</p>
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
                    className={`group relative border rounded-lg transition-all cursor-move ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${isDragging ? 'opacity-50' : ''} ${
                      isDraggedOver ? 'border-blue-400 bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex items-start p-4">
                      {/* Drag handle */}
                      <div className="flex-shrink-0 mr-3 mt-1">
                        <GripVertical className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-700">#{index + 1}</span>
                            {editingSegment === segment.id ? (
                              <Input
                                defaultValue={segment.conceptualName}
                                className="h-6 text-sm"
                                onBlur={(e) => handleEditSave(segment.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleEditSave(segment.id, e.currentTarget.value);
                                  } else if (e.key === 'Escape') {
                                    handleEditCancel();
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium text-sm">{segment.conceptualName}</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {mapping ? (
                              <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mapped
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <Circle className="h-3 w-3 mr-1" />
                                Ready
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div 
                          className="text-sm text-gray-600 leading-relaxed cursor-pointer"
                          onClick={() => onSegmentSelect(segment.id)}
                        >
                          {segmentText}
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex gap-1">
                            {mapping && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => onPlayMapping(mapping)}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Play
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleEditStart(segment.id)}
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onSegmentDelete(segment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
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