import { Accordion } from '@/components/ui/accordion';
import { TrackProgress } from '@shared/types';
import { TrackCard } from './TrackCard';

interface TrackListProps {
  tracks: TrackProgress[];
}

export function TrackList({ tracks }: TrackListProps) {
  // By default, open the first track that isn't fully complete, or the first one if all are complete/incomplete
  const firstIncompleteTrack = tracks.find(t => t.completedChapters < t.totalChapters) || tracks[0];
  const defaultValue = firstIncompleteTrack ? `track-${firstIncompleteTrack.trackId}` : undefined;

  return (
    <Accordion type="single" collapsible defaultValue={defaultValue} className="w-full space-y-4">
      {tracks.map((track) => (
        <TrackCard key={track.trackId} track={track} />
      ))}
    </Accordion>
  );
}
