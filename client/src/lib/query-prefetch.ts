// Phase 5C: Query Optimization - Prefetching utilities
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Prefetch chapter data for improved navigation performance
export function usePrefetchChapterData(trackId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (trackId) {
      // Prefetch chapters list for the track
      queryClient.prefetchQuery({
        queryKey: [`/api/content/tracks/${trackId}/chapters`],
        staleTime: 30000, // 30 seconds
      });
    }
  }, [trackId, queryClient]);
}

// Prefetch adjacent chapters when viewing a specific chapter
export function usePrefetchAdjacentChapters(trackId: string, currentChapterId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (trackId && currentChapterId) {
      // Get chapters list to find adjacent chapters
      const chaptersData = queryClient.getQueryData([`/api/content/tracks/${trackId}/chapters`]);

      if (chaptersData && Array.isArray(chaptersData)) {
        const currentIndex = chaptersData.findIndex((ch: any) => ch.id.toString() === currentChapterId);

        if (currentIndex >= 0) {
          // Prefetch previous chapter
          if (currentIndex > 0) {
            const prevChapter = chaptersData[currentIndex - 1];
            queryClient.prefetchQuery({
              queryKey: [`/api/content/chapters/${prevChapter.id}/details`],
              staleTime: 60000, // 1 minute
            });
          }

          // Prefetch next chapter
          if (currentIndex < chaptersData.length - 1) {
            const nextChapter = chaptersData[currentIndex + 1];
            queryClient.prefetchQuery({
              queryKey: [`/api/content/chapters/${nextChapter.id}/details`],
              staleTime: 60000, // 1 minute
            });
          }
        }
      }
    }
  }, [trackId, currentChapterId, queryClient]);
}

// Prefetch audio file metadata for chapters with audio
export function usePrefetchAudioMetadata(chapterId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (chapterId) {
      // Prefetch audio files for the chapter
      queryClient.prefetchQuery({
        queryKey: [`/api/audio-files/${chapterId}`],
        staleTime: 120000, // 2 minutes (audio metadata changes less frequently)
      });
    }
  }, [chapterId, queryClient]);
}

// Background cache warming for track navigation
export function useWarmTrackCache() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Warm the tracks cache on idle
    const warmCache = () => {
      queryClient.prefetchQuery({
        queryKey: ['/api/content/tracks'],
        staleTime: 300000, // 5 minutes
      });
    };

    // Use requestIdleCallback if available, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(warmCache);
    } else {
      setTimeout(warmCache, 100);
    }
  }, [queryClient]);
}