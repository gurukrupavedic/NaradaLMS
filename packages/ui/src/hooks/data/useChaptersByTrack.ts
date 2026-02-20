"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@narada/api-client";

export type ChapterListItem = {
  id: number;
  title: string;
  order: number;
  trackId: number;
  status?: string;
};

export function useChaptersByTrack(trackId: number | undefined) {
  return useQuery<ChapterListItem[]>({
    queryKey: [`/content/tracks/${trackId}/chapters`],
    queryFn: async () => {
      const res = await apiRequest<unknown>(
        `/content/tracks/${trackId}/chapters`
      );
      if (Array.isArray(res)) return res;
      if (
        res &&
        typeof res === "object" &&
        "data" in res &&
        Array.isArray((res as { data: unknown }).data)
      )
        return (res as { data: ChapterListItem[] }).data;
      if (
        res &&
        typeof res === "object" &&
        "items" in res &&
        Array.isArray((res as { items: unknown }).items)
      )
        return (res as { items: ChapterListItem[] }).items;
      return [];
    },
    enabled: !!trackId && trackId > 0,
  });
}
