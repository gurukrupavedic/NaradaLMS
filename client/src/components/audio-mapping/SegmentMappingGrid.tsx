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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Square } from 'lucide-react';
import { TimestampPill } from './TimestampPill';
import { EmptyTimestampPill } from './EmptyTimestampPill';
import { MappingSegmentCard } from '@/components/design-system/MappingSegmentCard';
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

  const getSegmentStatus = (segmentId: number): 'ready' | 'recording' | 'mapped' => {
    if (activeSegmentId === segmentId) return 'recording';
    if (getSegmentMapping(segmentId)) return 'mapped';
    return 'ready';
  };

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-6">
        <CardTitle className="text-base font-medium">Segment Mapping</CardTitle>
      </CardHeader>
      <CardContent className="p-0 max-h-[calc(100vh-400px)] flex flex-col">
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
                      <MappingSegmentCard
                        content={segmentText}
                        segmentNumber={index + 1}
                        status={status}
                        script={currentScript}
                        fontSize="28px"
                        onSegmentClick={() => onSegmentClick(segment.id)}
                      />
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