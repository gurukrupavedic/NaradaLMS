/**
 * Client-side admin portal access rules (mirrors server
 * `canAccessAdminPortal` / membership semantics). Do not import from `server/`.
 */

export interface MembershipLike {
  readonly status: string;
  readonly roles: readonly string[];
}

/** Membership row including org id (matches `/auth/me` membership shape). */
export interface MembershipWithOrgLike extends MembershipLike {
  readonly orgId: string;
}

const ORG_SCOPED_ROLES = new Set(["student", "instructor", "admin"]);

/**
 * True when there is an **active** membership for `currentOrgId` that includes `role`.
 * Used for org-scoped UI and route guards (§3.4 — no super-admin bypass).
 */
export function hasActiveOrgRole(
  memberships: readonly MembershipWithOrgLike[],
  currentOrgId: string | undefined,
  role: string
): boolean {
  if (!currentOrgId) {
    return false;
  }
  const row = memberships.find(
    (m) => m.orgId === currentOrgId && m.status === "active"
  );
  return Boolean(row?.roles.includes(role));
}

/**
 * Whether `role` is resolved from org membership (`user_organizations.roles`), not JWT alone.
 */
export function isOrgScopedRole(role: string): boolean {
  return ORG_SCOPED_ROLES.has(role);
}

/**
 * True when the user has an active org membership with role `admin` in any org.
 */
export function hasOrgAdminAnywhere(
  memberships: readonly MembershipLike[]
): boolean {
  return memberships.some(
    (m) => m.status === "active" && m.roles.includes("admin")
  );
}

/**
 * Resolves portal admission: prefers API `canAccessAdminPortal` when present,
 * else super-admin or active org admin anywhere.
 */
export function canAccessAdminPortalFromSession(input: {
  readonly isSuperAdmin: boolean;
  readonly memberships: readonly MembershipLike[];
  readonly canAccessAdminPortal?: boolean;
}): boolean {
  if (typeof input.canAccessAdminPortal === "boolean") {
    return input.canAccessAdminPortal;
  }
  return input.isSuperAdmin || hasOrgAdminAnywhere(input.memberships);
}

/** Minimal login response shape for post-login gate. */
export interface AuthLoginPayload {
  readonly user: { readonly isSuperAdmin: boolean };
  readonly canAccessAdminPortal?: boolean;
  readonly loginState?: {
    readonly memberships?: readonly MembershipLike[];
  };
}

/**
 * Login response gate: uses `canAccessAdminPortal` when the API sends it,
 * else derives from `loginState.memberships` and `user.isSuperAdmin`.
 */
export function canAccessAdminPortalFromLoginResponse(
  response: AuthLoginPayload
): boolean {
  if (typeof response.canAccessAdminPortal === "boolean") {
    return response.canAccessAdminPortal;
  }
  const memberships = response.loginState?.memberships ?? [];
  return (
    response.user.isSuperAdmin || hasOrgAdminAnywhere(memberships)
  );
}

const ORG_ADMIN_PATH_PREFIXES = [
  "/admin/batches",
  "/admin/content",
  "/admin/logs",
  "/admin/settings",
  "/admin/tracks",
] as const;

/**
 * True for org-scoped admin surfaces (Batches, Content, Audit, Settings, track editor).
 */
export function isOrgScopedAdminPath(
  pathname: string | null | undefined
): boolean {
  if (!pathname) {
    return false;
  }
  return ORG_ADMIN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * True for governance Users UI under `/admin/users`.
 */
export function isUsersAdminPath(
  pathname: string | null | undefined
): boolean {
  if (!pathname) {
    return false;
  }
  return (
    pathname === "/admin/users" || pathname.startsWith("/admin/users/")
  );
}
