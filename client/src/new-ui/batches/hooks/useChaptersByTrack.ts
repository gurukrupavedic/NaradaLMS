import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type ChapterListItem = {
  id: number;
  title: string;
  order: number;
  trackId: number;
  status?: string;
};

export function useChaptersByTrack(trackId: number | undefined) {
  return useQuery<ChapterListItem[]>({
    queryKey: [`/api/chapters/${trackId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/chapters/${trackId}`);
      return await res.json();
    },
    enabled: !!trackId && trackId > 0,
  });
}
