import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';

import { TrackProgress } from '@shared/types';
import { ChapterList } from './ChapterList';

interface TrackCardProps {
  track: TrackProgress;
}

export function TrackCard({ track }: TrackCardProps) {
  const completionPercentage = Math.round(
    (track.completedChapters / track.totalChapters) * 100
  );

  return (
    <AccordionItem
      value={`track-${track.trackId}`}
      className="border rounded-lg bg-card px-0 mb-4 overflow-hidden"
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors group">
        <div className="flex items-center gap-4 w-full pr-2 text-left">
          {/* Left Side: Info & Progress */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Track {track.trackOrder}
              </span>
              <h3 className="font-semibold text-lg text-card-foreground leading-none group-hover:text-primary transition-colors truncate">
                {track.trackTitle}
              </h3>
            </div>
            <Progress value={completionPercentage} className="h-1 w-full bg-muted/60" />
          </div>

          {/* Right Side: Stats (Next to Chevron) */}
          <div className="text-right">
            <span className="text-xs font-medium text-muted-foreground tabular-nums whitespace-nowrap opacity-80">
              {track.completedChapters}/{track.totalChapters} chapters
            </span>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4 pt-4 bg-card/50 border-t">
        <div className="mt-4">
          <ChapterList chapters={track.chapters} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
