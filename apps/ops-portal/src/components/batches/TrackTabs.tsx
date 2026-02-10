'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@narada/ui';
import { Badge } from '@narada/ui';
import { Skeleton } from '@narada/ui';
import type { Track } from './types';

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
            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
                <div className="text-sm font-medium text-gray-700">No tracks available</div>
                <div className="mt-2 text-sm text-gray-600">Create tracks in Content Studio to get started.</div>
            </div>
        );
    }

    return (
        <>
            <style>{scrollbarHideStyles}</style>
            <Tabs value={selectedTrackId} onValueChange={onSelectTrack} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto bg-muted p-1 scrollbar-hide">
                    {tracks.map((track) => {
                        const isCurrentTrack = currentTrackId === String(track.id);
                        return (
                            <TabsTrigger
                                key={track.id}
                                value={String(track.id)}
                                className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-background"
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
