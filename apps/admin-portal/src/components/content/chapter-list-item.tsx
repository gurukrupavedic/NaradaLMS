import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2, ArrowRight, ExternalLink, Headphones, Zap } from 'lucide-react';
import { Chapter } from '@narada/types';
import { Card, CardContent } from '@narada/ui';
import { Button } from '@narada/ui';
import { Badge } from '@narada/ui';

export type ChapterRow = Chapter & { description?: string; hasContent?: boolean; audioFileCount?: number; segmentCount?: number };

interface ChapterListItemProps {
    chapter: ChapterRow;
    index: number;
    onEdit: (chapter: ChapterRow) => void;
    onMove: (chapter: ChapterRow) => void;
    onDelete: (chapter: ChapterRow) => void;
    onOpen: (chapter: ChapterRow) => void;
}

export function ChapterListItem({ chapter, index, onEdit, onMove, onDelete, onOpen }: ChapterListItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });

    const isPublished = chapter.status === 'published';

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={`mb-3 group relative min-w-0 w-full ${isDragging ? 'opacity-80 z-20' : 'opacity-100 z-auto'}`}
        >
            <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-200 border hover:border-border/80 min-w-0 w-full">
                <div className="absolute left-0 top-0 bottom-0 w-1 transition-colors bg-transparent group-hover:bg-primary/50" />

                <div
                    {...attributes}
                    {...listeners}
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-20 p-2 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                    <GripVertical className="w-5 h-5 bg-card/80 backdrop-blur-[1px] rounded" />
                </div>

                <CardContent className="p-3 pl-8 flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-3 min-w-0">
                            <h3 className="font-semibold text-sm leading-snug truncate min-w-0">
                                <span className="text-muted-foreground font-mono mr-2 font-normal opacity-70 shrink-0">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <span className="truncate">{chapter.title}</span>
                            </h3>
                            <Badge
                                variant="secondary"
                                className={`flex-shrink-0 text-[10px] uppercase tracking-wider font-bold h-[18px] px-1.5 text-white ${isPublished ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-500 hover:bg-amber-600'
                                    }`}
                            >
                                {chapter.status}
                            </Badge>
                        </div>

                        {chapter.hasContent && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80" title="Audio Files">
                                    <Headphones className="w-3 h-3" />
                                    <span className="font-medium">{chapter.audioFileCount ?? 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80" title="Mappings">
                                    <Zap className="w-3 h-3 text-blue-500 fill-current" />
                                    <span className="font-medium">{chapter.segmentCount ?? 0}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 pt-1.5 mt-1.5 border-t border-border/30 min-w-0 flex-wrap">
                            <div className="flex items-center gap-0.5 min-w-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                                    onClick={() => onEdit(chapter)}
                                >
                                    <Edit2 className="w-3 h-3" />
                                    Edit
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                                    onClick={() => onMove(chapter)}
                                >
                                    <ArrowRight className="w-3 h-3" />
                                    Move
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                    onClick={() => onDelete(chapter)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                </Button>
                            </div>

                            <div className="flex-1 min-w-0" />

                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 shadow-sm shrink-0" onClick={() => onOpen(chapter)}>
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
