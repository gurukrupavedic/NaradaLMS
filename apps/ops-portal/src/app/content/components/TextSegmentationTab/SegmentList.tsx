import { useEffect, useMemo, memo } from 'react';
import { Trash2, FileText, GripVertical } from 'lucide-react';
import { Button, cn } from '@narada/ui';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LinkStatusIcon } from '@shared/components/LinkStatusIcon';
import { getSegmentText } from '@shared/utils/text-segmentation';
import type { ContentMap, Script } from '@narada/types';

import type { TextSegment } from '@narada/types';

type FrontendTextSegment = Omit<TextSegment, 'createdAt'> & {
    createdAt: string | Date | null;
};

interface AudioMapping {
    id: number;
    textSegmentId: number;
    audioFileId: number;
    startTime: number;
    endTime: number;
}

interface SegmentListProps {
    segments: FrontendTextSegment[];
    mappings: AudioMapping[];
    onDelete: (id: number) => void;
    getMappingStatus: (segmentId: number) => 'mapped' | 'unmapped';
    isPublished: boolean;
    selectedSegmentId?: number;
    onSelect?: (id: number) => void;
    content?: ContentMap;
    script?: Script;
}

interface SortableSegmentItemProps extends Omit<SegmentListProps, 'segments' | 'mappings' | 'content'> {
    segment: FrontendTextSegment;
    index: number;
    segmentText: string;
}

const SortableSegmentItem = memo(function SortableSegmentItem({
    segment,
    index,
    onDelete,
    getMappingStatus,
    isPublished,
    selectedSegmentId,
    onSelect,
    segmentText,
    script,
}: SortableSegmentItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: segment.id
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isSelected = selectedSegmentId === segment.id;

    return (
        <div
            ref={setNodeRef}
            style={style}
            id={`right-segment-${segment.id}`}
            onClick={() => onSelect?.(segment.id)}
            className={cn(
                "group pt-1.5 pb-0 px-2 border rounded-lg transition-all duration-200 cursor-pointer relative",
                isSelected
                    ? "bg-card border-mantra-base text-foreground"
                    : "bg-card border-border hover:bg-muted/50 transition-all text-foreground"
            )}
        >
            <div className="flex items-start gap-2">
                {/* Drag Handle */}
                {!isPublished && (
                    <div
                        {...attributes}
                        {...listeners}
                        className={cn(
                            "self-center -ml-1 p-1 cursor-grab active:cursor-grabbing",
                            isSelected
                                ? "text-mantra-base opacity-100"
                                : "text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider",
                            isSelected ? "bg-mantra-base text-white" : "bg-muted text-muted-foreground"
                        )}>
                            #{index + 1}
                        </span>
                        <span className={cn(
                            "text-[10px]",
                            isSelected ? "text-muted-foreground font-medium" : "text-muted-foreground"
                        )}>
                            {segment.startPosition}-{segment.endPosition}
                        </span>
                    </div>

                    <div
                        className={cn(
                            "line-clamp-2 pt-1 leading-[1.8] text-inherit",
                            !segmentText && "italic text-muted-foreground",
                            script === 'en' ? "text-[length:var(--font-size-standard)]" : "text-3xl",
                            script === 'hi' ? "font-[weight:var(--font-weight-devanagari)]" : "font-normal"
                        )}
                        style={{
                            fontFamily: script === 'te' ? "'JIMS', 'Noto Sans Telugu', sans-serif" :
                                script === 'hi' ? "'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif" :
                                    "'AdishilaSan', 'Noto Sans', sans-serif",
                        }}
                    >
                        {segmentText || "No text content"}
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-start">
                    <LinkStatusIcon
                        status={getMappingStatus(segment.id)}
                        size="sm"
                    />
                    {!isPublished && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent selection when deleting
                                onDelete(segment.id);
                            }}
                            className={cn(
                                "h-6 w-6 p-0 hover:bg-destructive/10",
                                isSelected ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-destructive"
                            )}
                            title="Delete segment"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
});

export function SegmentList(props: SegmentListProps) {
    const { segments, selectedSegmentId, content, script } = props;

    // Auto-scroll to selected segment
    useEffect(() => {
        if (selectedSegmentId) {
            const element = document.getElementById(`right-segment-${selectedSegmentId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [selectedSegmentId]);

    if (segments.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No segments created yet</p>
                <p className="text-xs mt-1">Select text to create segments</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {segments.map((segment, index) => {
                const segmentText = content && script
                    ? getSegmentText(segment as any, content, script)
                    : '';
                return (
                    <SortableSegmentItem
                        key={segment.id}
                        segment={segment}
                        index={index}
                        segmentText={segmentText}
                        {...props}
                    />
                );
            })}
        </div>
    );
}
