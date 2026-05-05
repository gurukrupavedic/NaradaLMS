"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@narada/api-client";

export type TrackListItem = {
  id: number;
  title: string;
  description?: string | null;
  sortOrder: number;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function useTracks() {
  return useQuery<TrackListItem[]>({
    queryKey: ["/content/tracks"],
    queryFn: async () => {
      const res = await apiRequest<unknown>("/content/tracks");
      if (Array.isArray(res)) return res;
      if (
        res &&
        typeof res === "object" &&
        "data" in res &&
        Array.isArray((res as { data: unknown }).data)
      )
        return (res as { data: TrackListItem[] }).data;
      if (
        res &&
        typeof res === "object" &&
        "items" in res &&
        Array.isArray((res as { items: unknown }).items)
      )
        return (res as { items: TrackListItem[] }).items;
      return [];
    },
  });
}
