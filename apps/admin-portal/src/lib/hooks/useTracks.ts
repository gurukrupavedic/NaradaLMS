import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export type Track = {
    id: number;
    title: string;
    description?: string | null;
    order: number;
    createdBy?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export function useTracks() {
    return useQuery<Track[]>({
        queryKey: ["/content/tracks"],
        queryFn: async () => {
            const res = await apiRequest<any>("/content/tracks");
            if (Array.isArray(res)) return res;
            if (res.data && Array.isArray(res.data)) return res.data;
            if (res.items && Array.isArray(res.items)) return res.items;
            return [];
        },
    });
}
