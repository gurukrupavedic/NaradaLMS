import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, GripVertical, Trash2, ArrowRight, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MockChapter } from '../mock-tracks-data';

interface SortableChapterItemProps {
    chapter: MockChapter;
    index: number;
    onEdit: (chapter: MockChapter) => void;
    onMove: (chapter: MockChapter) => void;
    onDelete: (chapter: MockChapter) => void;
    onOpen: (chapter: MockChapter) => void;
}

export function SortableChapterItem({
    chapter,
    index,
    onEdit,
    onMove,
    onDelete,
    onOpen,
}: SortableChapterItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: chapter.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 'auto',
        opacity: isDragging ? 0.8 : 1,
    };

    const isPublished = chapter.status === 'published';

    return (
        <div ref={setNodeRef} style={style} className="mb-3 group relative">
            <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200 border hover:border-border/80">
                {/* Accent Bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 transition-colors bg-transparent group-hover:bg-primary/50" />

                <CardContent className="p-4 pl-4 flex items-start gap-3">
                    {/* Drag Handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="mt-1 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground transition-colors px-1"
                    >
                        <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                        {/* Header: Title + Badge */}
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold text-sm leading-snug pt-0.5">
                                <span className="text-muted-foreground font-mono mr-2 font-normal opacity-70">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                {chapter.title}
                            </h3>
                            <Badge
                                variant="secondary"
                                className={`flex-shrink-0 text-[10px] uppercase tracking-wider font-bold h-5 px-2 text-white ${isPublished
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-amber-500 hover:bg-amber-600'
                                    }`}
                            >
                                {chapter.status}
                            </Badge>
                        </div>

                        {chapter.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {chapter.description}
                            </p>
                        )}

                        {/* Footer Row: Actions */}
                        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border/40">
                            {/* Secondary Actions */}
                            <div className="flex items-center gap-1">
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

                            <div className="flex-1" />

                            {/* Primary Action */}
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 shadow-sm"
                                onClick={() => onOpen(chapter)}
                            >
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
