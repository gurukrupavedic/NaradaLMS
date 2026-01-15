'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Track } from '../types/matrix';

const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

interface TrackTabsProps {
  tracks: Track[];
  selectedTrackId: string | undefined;
  currentTrackId: string | undefined; // From batch.trackId (shown with badge)
  onSelectTrack: (trackId: string) => void;
  isLoading?: boolean;
  children: React.ReactNode; // Tab content (matrix)
}

export function TrackTabs({
  tracks,
  selectedTrackId,
  currentTrackId,
  onSelectTrack,
  isLoading = false,
  children,
}: TrackTabsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-32" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <div className="text-sm font-medium text-gray-700">No tracks available</div>
        <div className="mt-2 text-sm text-gray-600">Create tracks in Content Studio to get started.</div>
      </div>
    );
  }

  return (
    <>
      <style>{scrollbarHideStyles}</style>
      <Tabs value={selectedTrackId} onValueChange={onSelectTrack} className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto bg-gray-100 dark:bg-gray-800 p-1 scrollbar-hide">
        {tracks.map((track) => {
          const isCurrentTrack = currentTrackId === String(track.id);
          return (
            <TabsTrigger
              key={track.id}
              value={String(track.id)}
              className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900"
            >
              <span className="text-sm font-medium">
                Track {track.order}
              </span>
              {isCurrentTrack && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Current
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {tracks.map((track) => (
        <TabsContent key={track.id} value={String(track.id)} className="mt-4">
          {children}
        </TabsContent>
      ))}
    </Tabs>
    </>
  );
}
