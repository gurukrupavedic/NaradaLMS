import { Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LinkStatusIcon } from '@shared/components/LinkStatusIcon';

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
}

export function SegmentList({
    segments,
    mappings,
    onDelete,
    getMappingStatus,
    isPublished,
}: SegmentListProps) {
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
                <div
                    key={segment.id}
                    className="group p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                                Segment {index + 1}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Position: {segment.startPosition}-{segment.endPosition}
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
                                    onClick={() => onDelete(segment.id)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                    title="Delete segment"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
