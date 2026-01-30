import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface StudentSearchResult {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: "pending_approval" | "active" | "inactive";
  roles: string[];
}

export function useSearchStudents(searchQuery: string) {
  return useQuery<{
    users: StudentSearchResult[];
    pagination: { limit: number; offset: number; total: number };
  }>({
    queryKey: ["/api/auth/admin/users?limit=100"],
    queryFn: getQueryFn({ on401: "throw" }),
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
