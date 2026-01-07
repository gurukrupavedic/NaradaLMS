import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2, LayoutTemplate } from 'lucide-react';
import { Track } from '@shared/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type TrackRow = Track & { chapterCount?: number };

interface TrackListItemProps {
  track: TrackRow;
  index: number;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onEdit: (track: TrackRow) => void;
  onDelete: (track: TrackRow) => void;
}

export function TrackListItem({ track, index, isSelected, onSelect, onEdit, onDelete }: TrackListItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || undefined,
      }}
      className={`mb-3 group relative ${isDragging ? 'opacity-80 z-20' : 'opacity-100 z-auto'}`}
    >
      <Card
        className={`relative overflow-hidden cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'border-y border-r border-l-[6px] border-l-primary border-y-border border-r-border shadow-md bg-slate-100 dark:bg-slate-800'
            : 'border hover:border-primary/50 hover:shadow-sm bg-card'
        }`}
        onClick={() => onSelect(track.id)}
      >
        <CardContent className="p-3 pl-3 flex items-stretch gap-3">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center -mr-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground transition-colors px-1"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 py-1 flex flex-col justify-between gap-1">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-semibold text-sm leading-tight truncate ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}
              >
                <span className="text-muted-foreground font-mono mr-2 font-normal opacity-70">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {track.title}
              </h3>
            </div>

            {track.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{track.description}</p>
            )}

            <div className="flex items-center gap-3 pt-1 mt-auto">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-medium">
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>{track.chapterCount ?? 0} chapters</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-1 border-l pl-2 ml-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(track);
              }}
              title="Edit Track"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(track);
              }}
              title="Delete Track"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
