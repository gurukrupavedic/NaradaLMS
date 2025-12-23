import { useMemo } from "react";
import { useAdminUsers, AdminUser } from "./useAdminUsers";

export type UserSearchParams = {
  role?: "student" | "instructor" | "content_manager" | "admin";
  status?: "pending_approval" | "active" | "inactive";
  q?: string;
};

export function useAdminUserSearch(params: UserSearchParams) {
  const { data, isLoading, isError } = useAdminUsers();

  const results = useMemo(() => {
    const users: AdminUser[] = data?.users ?? [];
    const q = (params.q ?? "").toLowerCase();

    return users.filter((u) => {
      // Role filter
      if (params.role && !(u.roles ?? []).includes(params.role)) return false;
      // Status filter
      if (params.status && u.status !== params.status) return false;
      // Query filter: email, firstName, lastName
      if (q) {
        const hay = `${u.email} ${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, params.role, params.status, params.q]);

  return { results, isLoading, isError };
}
