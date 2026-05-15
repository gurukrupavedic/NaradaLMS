import type { NextFunction, Request, Response } from "express";
import { parseXTenantSlugHeader } from "../../modules/identity-access/tenant-context";
import { identityStorage } from "../../modules/identity-access/storage";
import { catchAsync } from "../../utils/catchAsync";

/**
 * For `/api/learning/*` only: sets `req.orgId` from `X-Tenant-Slug` (tenant build),
 * not JWT default org. Requires an **active** `user_organizations` row for the resolved org
 * (§3.4 — no super-admin-only bypass). Run immediately after `jwtAuth` (which already ran
 * `attachOrgContext`); this middleware **overwrites** `req.orgId`.
 */
export const attachLearningTenantOrgContext = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const raw = req.headers["x-tenant-slug"];
    const slug = parseXTenantSlugHeader(raw);
    if (!slug) {
      const missing =
        raw === undefined ||
        (typeof raw === "string" && !raw.trim()) ||
        (Array.isArray(raw) && (!raw[0] || !String(raw[0]).trim()));
      return res.status(403).json({
        error: missing
          ? "X-Tenant-Slug header is required"
          : "Invalid X-Tenant-Slug",
        code: missing ? "TENANT_SLUG_REQUIRED" : "TENANT_SLUG_INVALID",
      });
    }

    const org = await identityStorage.getOrganizationBySlug(slug);
    if (!org) {
      return res.status(403).json({
        error: "Unknown tenant organization",
        code: "TENANT_ORG_NOT_FOUND",
      });
    }

    const user = req.user as Express.User | undefined;
    if (!user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const membership = await identityStorage.getMembershipByUserAndOrg(user.id, org.id);
    if (!membership || membership.status !== "active") {
      return res.status(403).json({
        error: "No active membership for this tenant",
        code: "TENANT_MEMBERSHIP_REQUIRED",
      });
    }

    req.orgId = org.id;
    next();
  }
);
