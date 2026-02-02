import { Accordion } from '@narada/ui/components/accordion';
import { TrackProgress, ChapterProgress } from '@narada/types';
import { TrackCard } from './TrackCard';

interface TrackListProps {
  tracks: TrackProgress[];
  onChapterClick?: (chapter: ChapterProgress, track: TrackProgress) => void;
  currentTrackId?: number; // Track ID currently being taught in the batch
}

export function TrackList({ tracks, onChapterClick, currentTrackId }: TrackListProps) {
  // Determine which track to open by default:
  // 1. If there's a current active track, open it.
  // 2. Otherwise, open the first incomplete track.
  // 3. Fallback to the first track.
  const targetTrack = currentTrackId
    ? tracks.find(t => t.trackId === currentTrackId)
    : (tracks.find(t => t.completedChapters < t.totalChapters) || tracks[0]);

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
