import React, { useState } from 'react';
import { Button, cn } from '@narada/ui';
import { Square } from 'lucide-react';
import { TimestampControl } from './components/TimestampControl';
import { SegmentCard } from '@/components/common/SegmentCard';
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
                {!hideHeader && (
                    <div className="px-4 h-11 bg-gray-50/50 dark:bg-gray-900/50 border-b flex-shrink-0 flex items-center">
                        <h2 className="text-sm font-medium text-muted-foreground">Segment Mapping</h2>
                    </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="p-4">
                        <div className="space-y-4 min-w-[800px]">
                            {segments.map((segment, index) => {
                                const mapping = getSegmentMapping(segment.id);
                                const status = getSegmentStatus(segment.id);
                                const segmentText = getSegmentText(segment, content, currentScript);

                                const isFirstSegment = index === 0;
                                const prevSegment = index > 0 ? segments[index - 1] : null;
                                const prevMapping = prevSegment ? mappings.find(m => m.segmentId === prevSegment.id) : null;
                                const previousSegmentEndTime = prevMapping?.endTime ?? 0;

                                return (
                                    <div key={segment.id} className="flex items-center gap-4 min-w-fit">
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
