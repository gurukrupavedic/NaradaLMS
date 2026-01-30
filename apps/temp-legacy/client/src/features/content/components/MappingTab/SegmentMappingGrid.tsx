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
import { Square } from 'lucide-react';
import { TimestampControl } from '@/features/content/components/TimestampControl';
import { SegmentCard } from '@/features/content/components/SegmentCard';
import type { TextSegment, AudioMapping, Script, ContentMap } from '@shared/types/text-segmentation';
import { getSegmentText } from '@shared/utils/text-segmentation';
import { cn } from '@/lib/utils';


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
  hideHeader?: boolean;
  className?: string;
  readOnly?: boolean;
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
  onEndSession,

  hideHeader,
  className,
  readOnly = false
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
    <div className="h-full">
      <div className={cn(
        "bg-card border rounded-lg h-full overflow-hidden shadow-sm flex flex-col",
        className
      )}>
        {/* Header */}
        {!hideHeader && (
          <div className="px-4 h-11 bg-gray-50/50 dark:bg-gray-900/50 border-b flex-shrink-0 flex items-center">
            <h2 className="text-sm font-medium text-muted-foreground">Segment Mapping</h2>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4">
            <div className="space-y-4 min-w-[800px]">
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
                    {/* Left: Segment card */}
                    <div className="flex-1">
                      <SegmentCard
                        content={segmentText}
                        segmentNumber={index + 1}
                        status={status}
                        script={currentScript}
                        fontSize="28px"
                        onClick={() => !readOnly && onSegmentClick(segment.id)}
                        className={readOnly ? 'opacity-70' : ''}
                        badgeNumber
                        showStatusIcon
                      />
                    </div>

                    {/* Right: Timestamp Control */}
                    <div className="flex-shrink-0">
                      <TimestampControl
                        segmentId={segment.id}
                        isMapped={!!mapping}
                        startTime={mapping?.startTime}
                        endTime={mapping?.endTime}
                        previousSegmentEndTime={previousSegmentEndTime}
                        isFirstSegment={isFirstSegment}
                        duration={duration}
                        isEditing={editingSegmentId === segment.id}
                        onEditStart={() => !readOnly && setEditingSegmentId(segment.id)}
                        onEditCancel={() => setEditingSegmentId(null)}
                        onPlay={(start, end) => {
                          const fakeEvent = { stopPropagation: () => { } } as React.MouseEvent;
                          // Ensure mapping is not undefined when playing
                          if (mapping) {
                            onPlaySegment({ ...mapping, startTime: start, endTime: end }, fakeEvent);
                          }
                        }}
                        onDelete={(id) => !readOnly && onMappingDelete(id)}
                        onUpdate={(id, updates) => !readOnly && onMappingUpdate(id, updates)}
                        onCreate={(m) => !readOnly && onMappingCreate(m)}
                        readOnly={readOnly}
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
                    className="w-full bg-vidyut-base hover:bg-vidyut-base/90 text-white py-6 text-lg font-medium shadow-md border-0"
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
      </div>
    </div>
  );
};