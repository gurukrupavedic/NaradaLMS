import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

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
            const res = await apiRequest<any>(`/content/tracks/${trackId}/chapters`);
            if (Array.isArray(res)) return res;
            if (res.data && Array.isArray(res.data)) return res.data;
            if (res.items && Array.isArray(res.items)) return res.items;
            return [];
        },
        enabled: !!trackId && trackId > 0,
    });
}
