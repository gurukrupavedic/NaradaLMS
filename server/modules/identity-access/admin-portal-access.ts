/**
 * Pure rules for who may open the admin portal (layout gate), independent of
 * JWT `orgRoles` for the current org.
 *
 * @see docs/implementation/multi-tenancy/platform-org-rbac-and-tenant-scoped-learning-plan.md (Slice 1)
 */

/**
 * Minimal membership fields needed for admin portal admission.
 */
export interface AdminPortalMembershipInput {
  readonly status: string;
  readonly roles: readonly string[];
}

/**
 * Returns whether the user may use the admin portal: platform super admin,
 * or at least one **active** membership whose roles include `admin` in any org.
 *
 * @param input - Super-admin flag and all org memberships for the user
 * @returns `true` if the admin portal entry gate should allow the session
 */
export function canAccessAdminPortal(input: {
  readonly isSuperAdmin: boolean;
  readonly memberships: readonly AdminPortalMembershipInput[];
}): boolean {
  if (input.isSuperAdmin) {
    return true;
  }
  return input.memberships.some(
    (m) => m.status === "active" && m.roles.includes("admin")
  );
}
