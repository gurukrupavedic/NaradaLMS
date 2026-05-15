import type { MembershipSummary } from "../hooks/useAuth";

export type SwitchableMembership = MembershipSummary & {
  status: "active";
};

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

export function getAdminSwitcherMemberships(
  memberships: MembershipSummary[],
  isSuperAdmin: boolean
): SwitchableMembership[] {
  return memberships.filter((membership): membership is SwitchableMembership => {
    if (membership.status !== "active") {
      return false;
    }

    return isSuperAdmin || membership.roles.includes("admin");
  });
}

export function getCurrentAdminMembership(
  memberships: SwitchableMembership[],
  currentOrgId?: string
): SwitchableMembership | null {
  if (memberships.length === 0) {
    return null;
  }

  if (!currentOrgId) {
    return memberships[0] ?? null;
  }

  return (
    memberships.find((membership) => membership.orgId === currentOrgId) ??
    memberships[0] ??
    null
  );
}

export function isOrgScopedAdminQueryKey(queryKey: readonly unknown[]): boolean {
  const [first, second] = queryKey;

  if (first === "audit-logs" || first === "content" || first === "batches") {
    return true;
  }

  if (first === "instructors" && second === "/admin/directory/users") {
    return true;
  }

  if (typeof first !== "string") {
    return false;
  }

  return (
    first.startsWith("/content/") ||
    first.startsWith("/batches/") ||
    first.startsWith("/admin/directory/users")
  );
}
