import React, { useState } from 'react';
import { Button, cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@narada/ui';
import { Square, RotateCcw } from 'lucide-react';
import { TimestampControl } from './components/TimestampControl';
import { SegmentCard } from '@/components/common/SegmentCard';
import type { SimplifiedMapping, Script, ContentMap } from '@narada/types';
import { getSegmentText } from '@narada/types';
import type { SegmentForMapper } from './ProgressiveMapper';

interface SegmentMappingGridProps {
    segments: SegmentForMapper[];
    currentScript: Script;
    content: ContentMap;
    mappings: SimplifiedMapping[];
    mappingSession: 'idle' | 'active' | 'paused';
    activeSegmentId: number | null;
    duration: number;
    onSegmentClick: (segmentId: number) => void;
    onPlaySegment: (mapping: SimplifiedMapping, event: React.MouseEvent) => void;
    onMappingUpdate: (segmentId: number, mapping: Partial<SimplifiedMapping>) => void;
    onMappingDelete: (segmentId: number) => void;
    onMappingCreate: (mapping: SimplifiedMapping) => void;
    onEndSession: () => void;
    onClearAll?: () => void;
    onScriptChange?: (script: 'te' | 'hi' | 'en') => void;
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
    onClearAll,
    onScriptChange,
    hideHeader,
    className,
    readOnly = false
}) => {
    const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);

    const getSegmentMapping = (segmentId: number): SimplifiedMapping | undefined => {
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
                    <div className="px-4 h-11 bg-muted border-b flex-shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Script:</span>
                            {onScriptChange ? (
                                <Select
                                    value={currentScript}
                                    onValueChange={(value) => onScriptChange(value as 'te' | 'hi' | 'en')}
                                >
                                    <SelectTrigger className="h-8 w-[140px] text-xs bg-background border border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="te">Telugu</SelectItem>
                                        <SelectItem value="hi">Devanagari</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <span className="text-sm font-bold text-foreground capitalize">{currentScript}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                {segments.length} segments
                            </span>
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {mappings.length} mapped
                            </span>
                            {mappings.length > 0 && onClearAll && !readOnly && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive px-2 transition-colors ml-2"
                                        >
                                            <RotateCcw className="h-3 w-3 mr-1" />
                                            Clear All
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Clear All Mappings?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently remove all audio mappings for the current audio file.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={onClearAll} className="bg-destructive hover:bg-destructive/90">
                                                Yes, clear all
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
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
