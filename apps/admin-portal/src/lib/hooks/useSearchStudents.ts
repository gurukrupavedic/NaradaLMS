import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface StudentSearchResult {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
}

export function useSearchStudents(searchQuery: string) {
    return useQuery<{
        users: StudentSearchResult[];
        pagination: { limit: number; offset: number; total: number };
    }>({
        queryKey: ["/admin/directory/users?membershipRole=student&limit=200"],
        queryFn: async () => {
            return apiRequest<{
                users: StudentSearchResult[];
                pagination: { limit: number; offset: number; total: number };
            }>("/admin/directory/users?membershipRole=student&limit=200");
        },
        enabled: true, // Always fetch to have full list available
        select: (data) => {
            // Filter results based on search query
            if (!searchQuery.trim()) {
                return data;
            }

            const query = searchQuery.toLowerCase();
            const filtered = data.users.filter(
                (user) =>
                    user.email.toLowerCase().includes(query) ||
                    user.firstName?.toLowerCase().includes(query) ||
                    user.lastName?.toLowerCase().includes(query) ||
                    user.id.toLowerCase().includes(query)
            );

            return {
                users: filtered,
                pagination: data.pagination,
            };
        },
    });
}
