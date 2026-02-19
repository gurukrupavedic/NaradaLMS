"use client";

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
            const res = await apiRequest<unknown>("/content/tracks");
            if (Array.isArray(res)) return res;
            if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: unknown }).data))
                return (res as { data: Track[] }).data;
            if (res && typeof res === "object" && "items" in res && Array.isArray((res as { items: unknown }).items))
                return (res as { items: Track[] }).items;
            return [];
        },
    });
}
