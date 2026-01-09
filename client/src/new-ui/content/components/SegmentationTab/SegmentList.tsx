import { useRef, useEffect } from 'react';
import { Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export function SegmentList({
    segments,
    mappings,
    onDelete,
    getMappingStatus,
    isPublished,
    selectedSegmentId,
    onSelect,
    content,
    script,
}: SegmentListProps) {
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
            {segments.map((segment, index) => {
                const isSelected = selectedSegmentId === segment.id;
                // Use shared utility to properly extract plain text from HTML content
                const segmentText = content && script
                    ? getSegmentText(segment, content, script)
                    : '';

                return (
                    <div
                        key={segment.id}
                        id={`segment-${segment.id}`}
                        onClick={() => onSelect?.(segment.id)}
                        className={cn(
                            "group p-3 border rounded-lg transition-colors cursor-pointer",
                            isSelected
                                ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 ring-1 ring-blue-300 dark:ring-blue-700"
                                : "bg-card hover:bg-accent/50"
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                        "text-xs font-medium px-1.5 py-0.5 rounded",
                                        isSelected ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    )}>
                                        #{index + 1}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {segment.startPosition}-{segment.endPosition}
                                    </span>
                                </div>

                                <div
                                    className={cn(
                                        "leading-relaxed line-clamp-2",
                                        !segmentText && "italic text-muted-foreground"
                                    )}
                                    style={{
                                        fontFamily: script === 'te' ? "'JIMS', 'Noto Sans Telugu', sans-serif" :
                                            script === 'hi' ? "'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif" :
                                                "'AdishilaSan', 'Noto Sans', sans-serif",
                                        fontSize: 'var(--font-size-standard)',
                                        fontWeight: script === 'hi' ? 'var(--font-weight-devanagari)' : 400
                                    }}
                                >
                                    {segmentText || "No text content"}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <LinkStatusIcon
                                    status={getMappingStatus(segment.id)}
                                    size="md"
                                />
                                {!isPublished && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent selection when deleting
                                            onDelete(segment.id);
                                        }}
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                        title="Delete segment"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
