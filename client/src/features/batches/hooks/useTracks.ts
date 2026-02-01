import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
    queryKey: ["/api/content/tracks"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/content/tracks");
      return await res.json();
    },
  });
}
