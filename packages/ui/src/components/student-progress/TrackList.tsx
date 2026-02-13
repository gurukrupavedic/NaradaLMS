import { Accordion } from "../accordion";
import type { TrackProgress, ChapterProgress } from "@narada/types";
import { TrackCard } from "./TrackCard";

interface TrackListProps {
  tracks: TrackProgress[];
  onChapterClick?: (chapter: ChapterProgress, track: TrackProgress) => void;
  currentTrackId?: number;
}

export function TrackList({ tracks, onChapterClick, currentTrackId }: TrackListProps) {
  const targetTrack = currentTrackId
    ? tracks.find((t) => t.trackId === currentTrackId)
    : tracks.find((t) => t.completedChapters < t.totalChapters) || tracks[0];
  const defaultValue = targetTrack ? [`track-${targetTrack.trackId}`] : undefined;

  return (
    <Accordion type="multiple" defaultValue={defaultValue} className="w-full space-y-4">
      {tracks.map((track) => (
        <TrackCard
          key={track.trackId}
          track={track}
          onChapterClick={onChapterClick}
          isCurrentTrack={currentTrackId === track.trackId}
        />
      ))}
    </Accordion>
  );
}
