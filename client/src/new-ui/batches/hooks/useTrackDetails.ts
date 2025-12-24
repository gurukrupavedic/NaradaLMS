import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface TrackDetails {
  id: number;
  title: string;
  description: string;
  order: number;
}

export function useTrackDetails(trackId: number | null | undefined) {
  return useQuery<TrackDetails>({
    queryKey: [`/api/content/tracks/${trackId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!trackId,
  });
}
