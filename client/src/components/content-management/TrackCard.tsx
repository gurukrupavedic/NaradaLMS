import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Edit, Trash2, FileText } from "lucide-react";

interface Track {
  id: number;
  title: string;
  description: string;
  order: number;
  chapterCount: number;
  lastModified: string;
}

interface TrackCardProps {
  track: Track;
  index: number;
  totalTracks: number;
  isMovePending: boolean;
  onNavigate: (trackId: number) => void;
  onEdit: (track: Track) => void;
  onDelete: (track: Track) => void;
  onMove: (trackId: number, direction: 'up' | 'down') => void;
}

export function TrackCard({
  track,
  index,
  totalTracks,
  isMovePending,
  onNavigate,
  onEdit,
  onDelete,
  onMove
}: TrackCardProps) {
  return (
    <Card 
      key={track.id} 
      className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onNavigate(track.id)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Track Ordering Controls */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 sm:h-5 sm:w-5 p-0"
                disabled={track.order === 1 || isMovePending}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(track.id, 'up');
                }}
                title="Move track up"
              >
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 sm:h-5 sm:w-5 p-0"
                disabled={index === totalTracks - 1 || isMovePending}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(track.id, 'down');
                }}
                title="Move track down"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>

            {/* Track Info */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                  {track.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                  {track.description}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">Track {track.order || index + 1}</span>
                  <span>•</span>
                  <span>{track.chapterCount} chapters</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(track);
              }}
              title="Edit track"
            >
              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(track);
              }}
              title="Delete track"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}