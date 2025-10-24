/**
 * Segment Mapping Grid Component
 * 
 * Handles segment display, interaction, and mapping visualization
 * for the audio mapping workflow.
 * 
 * Created: January 2025
 * Purpose: Interactive segment grid for audio mapping
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Link2Off, Square } from 'lucide-react';
import { TimestampPill } from './TimestampPill';
import { EmptyTimestampPill } from './EmptyTimestampPill';
import { ConnectedCirclesIcon } from '@shared/components/icons';
import type { TextSegment, AudioMapping, Script, ContentMap } from '@shared/types/text-segmentation';
import { getSegmentText } from '@shared/utils/text-segmentation';


interface SegmentMappingGridProps {
  segments: TextSegment[];
  currentScript: Script;
  content: ContentMap;
  mappings: AudioMapping[];
  mappingSession: 'idle' | 'active' | 'paused';
  activeSegmentId: number | null;
  duration: number;
  onSegmentClick: (segmentId: number) => void;
  onPlaySegment: (mapping: AudioMapping, event: React.MouseEvent) => void;
  onMappingUpdate: (segmentId: number, mapping: Partial<AudioMapping>) => void;
  onMappingDelete: (segmentId: number) => void;
  onMappingCreate: (mapping: AudioMapping) => void;
  onEndSession: () => void;
}

export const SegmentMappingGrid: React.FC<SegmentMappingGridProps> = ({
  segments,
  currentScript,
  content,
  mappings,
  mappingSession,
  activeSegmentId,
  duration,
  onSegmentClick,
  onPlaySegment,
  onMappingUpdate,
  onMappingDelete,
  onMappingCreate,
  onEndSession
}) => {
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);

  const getSegmentMapping = (segmentId: number): AudioMapping | undefined => {
    return mappings.find(m => m.segmentId === segmentId);
  };

  const getSegmentStatus = (segmentId: number) => {
    if (activeSegmentId === segmentId) return 'active';
    if (getSegmentMapping(segmentId)) return 'completed';
    return 'inactive';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Segment Mapping</CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100vh-450px)] flex flex-col">
        <div className="flex-1 relative overflow-auto">
          <div className="px-6 py-4">
            <div className="space-y-3 min-w-[800px]">
              {segments.map((segment, index) => {
                const mapping = getSegmentMapping(segment.id);
                const status = getSegmentStatus(segment.id);
                const segmentText = getSegmentText(segment, content, currentScript);
                
                // Calculate values for EmptyTimestampPill
                const isFirstSegment = index === 0;
                const prevSegment = index > 0 ? segments[index - 1] : null;
                const prevMapping = prevSegment ? mappings.find(m => m.segmentId === prevSegment.id) : null;
                const previousSegmentEndTime = prevMapping?.endTime ?? 0;
                
                return (
                  <div key={segment.id} className="flex items-center gap-4 min-w-fit">
                    {/* Left: Timestamp pill */}
                    <div className="w-32 flex-shrink-0 flex items-center justify-start">
                      {mapping ? (
                        <TimestampPill
                          segmentId={segment.id}
                          startTime={mapping.startTime}
                          endTime={mapping.endTime}
                          isEditing={editingSegmentId === segment.id}
                          onPlay={(start, end) => {
                            const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
                            onPlaySegment(mapping, fakeEvent);
                          }}
                          onDelete={(segmentId) => onMappingDelete(segmentId)}
                          onTimestampUpdate={onMappingUpdate}
                          onEditStart={() => setEditingSegmentId(segment.id)}
                          onEditCancel={() => setEditingSegmentId(null)}
                          duration={duration}
                        />
                      ) : (
                        <EmptyTimestampPill
                          segmentId={segment.id}
                          isFirstSegment={isFirstSegment}
                          previousSegmentEndTime={previousSegmentEndTime}
                          isEditing={editingSegmentId === segment.id}
                          onEditStart={() => setEditingSegmentId(segment.id)}
                          onEditCancel={() => setEditingSegmentId(null)}
                          onMappingCreate={onMappingCreate}
                          duration={duration}
                        />
                      )}
                    </div>

                    {/* Right: Segment card */}
                    <div className="flex-1">
                      <div
                        onClick={() => onSegmentClick(segment.id)}
                        className={`border rounded-lg transition-all cursor-pointer ${
                          status === 'active' 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : mappingSession === 'active'
                            ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start px-4 py-3">
                          {/* Left: Number and status */}
                          <div className="flex items-center gap-3 mr-4">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 min-w-6 justify-center">
                              {index + 1}
                            </Badge>
                            <div className="flex-shrink-0">
                              {status === 'active' ? (
                                <Badge variant="default" className="text-xs bg-blue-100 text-blue-700">
                                  <Clock className="h-3 w-3 mr-1 animate-strong-pulse" />
                                  Recording
                                </Badge>
                              ) : status === 'completed' ? (
                                <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                  <ConnectedCirclesIcon className="h-4 w-4 mr-1" />
                                  Mapped
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Link2Off className="h-3 w-3 mr-1" />
                                  Ready
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Right: Content */}
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-gray-700 leading-relaxed"
                              style={{
                                fontFamily: currentScript === 'te' ? "'JIMS', 'Noto Sans Telugu', sans-serif" :
                                            currentScript === 'hi' ? "'Adishila San', 'Noto Sans Devanagari', serif" :
                                            "'JIMS', 'Noto Sans Telugu', sans-serif",
                                fontSize: '28px'
                              }}
                            >
                              {segmentText}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* END button - only shown during active or paused sessions */}
              {(mappingSession === 'active' || mappingSession === 'paused') && (
                <div className="mt-6 pt-4 border-t">
                  <Button 
                    onClick={onEndSession}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-medium"
                    disabled={!activeSegmentId && mappingSession !== 'paused'}
                  >
                    <Square className="h-5 w-5 mr-2" />
                    END
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {activeSegmentId 
                      ? "Click to mark end of current segment and complete session"
                      : "Start recording a segment first, or pause/stop the session"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};