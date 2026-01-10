import { useRef, useEffect } from 'react';
import { Trash2, FileText, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LinkStatusIcon } from '@shared/components/LinkStatusIcon';
import { getSegmentText } from '@shared/utils/text-segmentation';
import type { ContentMap, Script } from '@shared/types/text-segmentation';
import { cn } from '@/lib/utils';

interface TextSegment {
    id: number;
    chapterId: number;
    script: 'te' | 'hi' | 'en';
    startPosition: number;
    endPosition: number;
    order: number;
}

interface AudioMapping {
    id: number;
    textSegmentId: number;
    audioFileId: number;
    startTime: number;
    endTime: number;
}

interface SegmentListProps {
    segments: TextSegment[];
    mappings: AudioMapping[];
    onDelete: (id: number) => void;
    getMappingStatus: (segmentId: number) => 'mapped' | 'unmapped';
    isPublished: boolean;
    selectedSegmentId?: number;
    onSelect?: (id: number) => void;
    content?: ContentMap;
    script?: Script;
}

interface SortableSegmentItemProps extends Omit<SegmentListProps, 'segments' | 'mappings'> {
    segment: TextSegment;
    index: number;
}

function SortableSegmentItem({
    segment,
    index,
    onDelete,
    getMappingStatus,
    isPublished,
    selectedSegmentId,
    onSelect,
    content,
    script,
}: SortableSegmentItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: segment.id
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isSelected = selectedSegmentId === segment.id;
    // Use shared utility to properly extract plain text from HTML content
    const segmentText = content && script
        ? getSegmentText(segment, content, script)
        : '';

    return (
        <div
            ref={setNodeRef}
            style={style}
            id={`segment-${segment.id}`}
            onClick={() => onSelect?.(segment.id)}
            className={cn(
                "group pt-1.5 pb-0 px-2 border rounded-lg transition-colors cursor-pointer relative",
                isSelected
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 ring-1 ring-blue-300 dark:ring-blue-700"
                    : "bg-card hover:bg-accent/50"
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
                                ? "text-blue-400 hover:text-blue-600 opacity-100"
                                : "text-muted-foreground/50 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn(
                            "text-xs font-medium px-1.5 py-0.5 rounded",
                            isSelected ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}>
                            #{index + 1}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {segment.startPosition}-{segment.endPosition}
                        </span>
                    </div>

                    <div
                        className={cn(
                            "line-clamp-2 pt-1",
                            !segmentText && "italic text-muted-foreground"
                        )}
                        style={{
                            fontFamily: script === 'te' ? "'JIMS', 'Noto Sans Telugu', sans-serif" :
                                script === 'hi' ? "'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif" :
                                    "'AdishilaSan', 'Noto Sans', sans-serif",
                            fontSize: 'var(--font-size-standard)',
                            fontWeight: script === 'hi' ? 'var(--font-weight-devanagari)' : 400,
                            lineHeight: 1.85
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
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            title="Delete segment"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function SegmentList(props: SegmentListProps) {
    const { segments, selectedSegmentId } = props;

    // Auto-scroll to selected segment
    useEffect(() => {
        if (selectedSegmentId) {
            const element = document.getElementById(`segment-${selectedSegmentId}`);
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
            {segments.map((segment, index) => (
                <SortableSegmentItem
                    key={segment.id}
                    segment={segment}
                    index={index}
                    {...props}
                />
            ))}
        </div>
    );
}
