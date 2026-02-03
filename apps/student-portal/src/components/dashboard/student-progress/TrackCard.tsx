import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Progress,
  Badge
} from '@narada/ui';

import { TrackProgress } from '@narada/types';
import { ChapterList } from './ChapterList';

interface TrackCardProps {
  track: TrackProgress;
  onChapterClick?: (chapter: any, track: TrackProgress) => void;
  isCurrentTrack?: boolean;
}

export function TrackCard({ track, onChapterClick, isCurrentTrack }: TrackCardProps) {
  const completionPercentage = Math.round(
    (track.completedChapters / track.totalChapters) * 100
  );

  return (
    <AccordionItem
      value={`track-${track.trackId}`}
      className="border rounded-lg bg-card px-4 pb-4 pt-2 overflow-hidden"
    >
      <AccordionTrigger className="-mx-4 px-4 py-2 hover:no-underline hover:bg-muted/30 transition-colors group relative">
        <div className="w-full pr-2 text-left">
          {/* Top Row: Title & Stats */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="font-medium text-sm text-card-foreground leading-normal group-hover:text-primary transition-colors truncate">
                Track {track.trackOrder} - {track.trackTitle}
              </h3>
              {isCurrentTrack && (
                <Badge variant="default" className="text-xs whitespace-nowrap h-5 px-1.5">
                  Current
                </Badge>
              )}
            </div>

            <span className="text-xs font-medium text-muted-foreground tabular-nums whitespace-nowrap opacity-80 flex-shrink-0">
              {track.completedChapters}/{track.totalChapters} chapters
            </span>
          </div>

          {/* Bottom Row: Progress (Absolute) */}
          <Progress value={completionPercentage} className="absolute bottom-0 left-0 right-0 h-1 w-full bg-muted/60 rounded-none transform translate-y-px" />
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-0 pb-0 pt-2 bg-transparent">
        <ChapterList
          chapters={track.chapters}
          onChapterClick={onChapterClick ? (chapter) => onChapterClick(chapter, track) : undefined}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
