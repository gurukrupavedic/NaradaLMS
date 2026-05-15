export type AdminUserStatusFilter =
  | "all"
  | "pending"
  | "active"
  | "inactive"
  | "rejected";

export type AdminUserOrgFilter = "all" | "slmts" | "rr";

export const ADMIN_USER_ORG_FILTER_OPTIONS: {
  value: AdminUserOrgFilter;
  label: string;
}[] = [
  { value: "all", label: "All organizations" },
  { value: "slmts", label: "SLMTS" },
  { value: "rr", label: "RR" },
];

export function buildAdminUsersSearchParams(params: {
  limit: number;
  offset: number;
  status?: AdminUserStatusFilter;
  search?: string;
  orgSlug?: AdminUserOrgFilter;
}): URLSearchParams {
  const searchParams = new URLSearchParams({
    limit: params.limit.toString(),
    offset: params.offset.toString(),
  });

  if (params.search?.trim()) {
    searchParams.append("search", params.search.trim());
  }

  if (params.status && params.status !== "all") {
    const statusMap: Record<Exclude<AdminUserStatusFilter, "all">, string> = {
      pending: "pending",
      active: "active",
      inactive: "inactive",
      rejected: "rejected",
    };

    searchParams.append("membershipStatus", statusMap[params.status]);
  }

  if (params.orgSlug && params.orgSlug !== "all") {
    searchParams.append("orgSlug", params.orgSlug);
  }

  return searchParams;
}
