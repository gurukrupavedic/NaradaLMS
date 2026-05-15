import type { TenantSlug } from "../config/tenants";

export type TenantMembershipStatus =
  | "pending"
  | "active"
  | "inactive"
  | "rejected";

export type TenantAccessState =
  | "active"
  | "pending"
  | "needs_membership"
  | "inactive"
  | "rejected";

export interface TenantMembershipSummary {
  membershipId: string;
  orgId: string;
  orgSlug: TenantSlug;
  orgName: string;
  roles: string[];
  status: TenantMembershipStatus;
}

export interface TenantScopedSession {
  currentOrgId?: string;
  memberships: TenantMembershipSummary[];
  hasActiveMembership: boolean;
  isSuperAdmin: boolean;
}

export function getCurrentTenantMembership(
  session: TenantScopedSession,
  tenantSlug: TenantSlug
): TenantMembershipSummary | null {
  return (
    session.memberships.find(
      (membership) => membership.orgSlug === tenantSlug
    ) ?? null
  );
}

export function getTenantAccessState(
  session: TenantScopedSession,
  tenantSlug: TenantSlug
): TenantAccessState {
  if (session.isSuperAdmin) {
    return "active";
  }

  const membership = getCurrentTenantMembership(session, tenantSlug);
  if (!membership) {
    return "needs_membership";
  }

  switch (membership.status) {
    case "active":
      return "active";
    case "pending":
      return "pending";
    case "inactive":
      return "inactive";
    case "rejected":
      return "rejected";
    default: {
      const exhaustiveCheck: never = membership.status;
      return exhaustiveCheck;
    }
  }
}

export function getTenantSwitchOrgId(
  session: TenantScopedSession,
  tenantSlug: TenantSlug,
  failedOrgId?: string | null
): string | null {
  const membership = getCurrentTenantMembership(session, tenantSlug);
  if (!membership || membership.status !== "active") {
    return null;
  }

  if (failedOrgId && membership.orgId === failedOrgId) {
    return null;
  }

  if (membership.orgId === session.currentOrgId) {
    return null;
  }

  return membership.orgId;
}
