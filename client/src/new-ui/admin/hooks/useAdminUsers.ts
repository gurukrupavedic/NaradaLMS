import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type AdminUser = {
  id: string;
  email: string;
  status: "pending_approval" | "active" | "inactive";
  roles: string[];
  firstName?: string | null;
  lastName?: string | null;
  createdAt?: string | null;
};

export function useAdminUsers() {
  return useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/auth/admin/users"],
  });
}

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/auth/admin/users/${userId}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/admin/users" ]});
    },
  });
}

export function useAssignRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      const res = await apiRequest("POST", `/api/auth/admin/users/${userId}/roles`, { roles });
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/admin/users" ]});
    },
  });
}

export function useDisableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/auth/admin/users/${userId}/disable`);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/admin/users" ]});
    },
  });
}
