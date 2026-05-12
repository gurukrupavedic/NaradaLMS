import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

import { config } from "../../config";

export const ALLOWED_TENANT_SLUGS = ["slmts", "rr"] as const;
export type TenantSlug = (typeof ALLOWED_TENANT_SLUGS)[number];
const LOCAL_PORTAL_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3010",
] as const;

interface OAuthStateContext {
  tenantSlug?: TenantSlug;
  returnTo?: string;
}

function isTenantSlug(value: string): value is TenantSlug {
  return (ALLOWED_TENANT_SLUGS as readonly string[]).includes(value);
}

function getOAuthStateFromRequest(req: Request): string | null {
  const state = req.query.state;
  if (typeof state === "string") {
    return state;
  }
  if (Array.isArray(state) && typeof state[0] === "string") {
    return state[0];
  }
  return null;
}

function getQueryTenantSlug(req: Request): string | undefined {
  const tenantSlug = req.query.tenantSlug;
  if (typeof tenantSlug === "string") {
    return tenantSlug.trim().toLowerCase();
  }
  if (Array.isArray(tenantSlug) && typeof tenantSlug[0] === "string") {
    return tenantSlug[0].trim().toLowerCase();
  }
  return undefined;
}

function getRequestedReturnTo(req: Request): string | undefined {
  const returnTo = req.query.returnTo;
  if (typeof returnTo === "string") {
    return returnTo.trim();
  }
  if (Array.isArray(returnTo) && typeof returnTo[0] === "string") {
    return returnTo[0].trim();
  }
  return undefined;
}

function sanitizeReturnTo(returnTo?: string): string {
  if (!returnTo) {
    return config.frontendUrl;
  }

  try {
    const redirectUrl = new URL(returnTo);
    if (!["http:", "https:"].includes(redirectUrl.protocol)) {
      return config.frontendUrl;
    }

    const allowedOriginSources =
      config.env === "production"
        ? [config.frontendUrl, ...config.corsOrigins]
        : [config.frontendUrl, ...config.corsOrigins, ...LOCAL_PORTAL_ORIGINS];
    const allowedOrigins = new Set(
      allowedOriginSources.flatMap((value) => {
        try {
          return [new URL(value).origin];
        } catch {
          return [];
        }
      })
    );

    if (!allowedOrigins.has(redirectUrl.origin)) {
      return config.frontendUrl;
    }

    return redirectUrl.toString();
  } catch {
    return config.frontendUrl;
  }
}

function signOAuthState(payload: string): string {
  return createHmac("sha256", config.jwt.secret).update(payload).digest("base64url");
}

function isValidOAuthSignature(payload: string, signature: string): boolean {
  const expectedSignature = signOAuthState(payload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

function parseOAuthState(rawState?: string | null): OAuthStateContext {
  if (!rawState) {
    return {};
  }

  const [payload, signature, ...rest] = rawState.split(".");
  if (!payload || !signature || rest.length > 0) {
    return {};
  }

  if (!isValidOAuthSignature(payload, signature)) {
    return {};
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as OAuthStateContext;
    const rawTenantSlug = parsed.tenantSlug?.trim().toLowerCase();
    const returnTo = parsed.returnTo?.trim();

    return {
      tenantSlug:
        rawTenantSlug && isTenantSlug(rawTenantSlug)
          ? rawTenantSlug
          : undefined,
      returnTo: returnTo || undefined,
    };
  } catch {
    return {};
  }
}

export function buildOAuthState(options: {
  tenantSlug?: TenantSlug;
  returnTo?: string;
}): string {
  const payload = Buffer.from(
    JSON.stringify({
      tenantSlug: options.tenantSlug,
      returnTo: sanitizeReturnTo(options.returnTo),
    } satisfies OAuthStateContext),
    "utf8"
  ).toString("base64url");

  return `${payload}.${signOAuthState(payload)}`;
}

export function resolveRequestedPostAuthRedirect(req: Request): string {
  return sanitizeReturnTo(getRequestedReturnTo(req));
}

export function resolveSafePostAuthRedirect(rawState?: string | null): string {
  const { returnTo } = parseOAuthState(rawState);
  return sanitizeReturnTo(returnTo);
}

/**
 * Resolve tenant slug for registration (and OAuth default org).
 * Order: verified OAuth `state`, query `tenantSlug`, `X-Tenant-Slug` header,
 * optional `tenantSlug` in body, then `DEFAULT_TENANT_SLUG` / `slmts`.
 */
export function resolveTenantSlugForRequest(
  req: Request,
  bodyTenantSlug?: string
): TenantSlug {
  const oauthStateTenantSlug =
    parseOAuthState(getOAuthStateFromRequest(req)).tenantSlug;
  const queryTenantSlug = getQueryTenantSlug(req);
  const header = req.get("x-tenant-slug")?.trim().toLowerCase();
  const body = bodyTenantSlug?.trim().toLowerCase();
  const candidate =
    oauthStateTenantSlug ||
    queryTenantSlug ||
    header ||
    body ||
    config.defaultTenantSlug;
  if (candidate && isTenantSlug(candidate)) {
    return candidate;
  }
  return "slmts";
}
