import type { Request } from "express";
import { config } from "../../config";

export const ALLOWED_TENANT_SLUGS = ["slmts", "rr"] as const;
export type TenantSlug = (typeof ALLOWED_TENANT_SLUGS)[number];

function isTenantSlug(value: string): value is TenantSlug {
  return (ALLOWED_TENANT_SLUGS as readonly string[]).includes(value);
}

/**
 * Resolve tenant slug for registration (and OAuth default org).
 * Order: `X-Tenant-Slug` header, optional `tenantSlug` in body, then `DEFAULT_TENANT_SLUG` / `slmts`.
 */
export function resolveTenantSlugForRequest(
  req: Request,
  bodyTenantSlug?: string
): TenantSlug {
  const header = req.get("x-tenant-slug")?.trim().toLowerCase();
  const body = bodyTenantSlug?.trim().toLowerCase();
  const candidate = header || body || config.defaultTenantSlug;
  if (candidate && isTenantSlug(candidate)) {
    return candidate;
  }
  return "slmts";
}
