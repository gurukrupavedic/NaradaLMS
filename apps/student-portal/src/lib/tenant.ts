import type { Metadata } from "next";

import {
  DEFAULT_TENANT_SLUG,
  TENANT_CONFIGS,
  type TenantConfig,
  type TenantSlug,
} from "../config/tenants";

export interface StudentRegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface TenantRegisterRequest {
  body: StudentRegisterPayload & { tenantSlug: TenantSlug };
  headers: {
    "X-Tenant-Slug": TenantSlug;
  };
}

export function resolveTenantSlug(rawTenant?: string | null): TenantSlug {
  return rawTenant === "rr" ? "rr" : DEFAULT_TENANT_SLUG;
}

export function getCurrentTenantSlug(): TenantSlug {
  return resolveTenantSlug(process.env.TENANT);
}

export function getTenantConfig(slug: TenantSlug = getCurrentTenantSlug()): TenantConfig {
  return TENANT_CONFIGS[slug];
}

export function getTenantMetadata(
  slug: TenantSlug = getCurrentTenantSlug()
): Metadata {
  const tenantConfig = getTenantConfig(slug);

  return {
    title: tenantConfig.metadataTitle,
    description: tenantConfig.metadataDescription,
    icons: {
      icon: [{ url: tenantConfig.iconPath }],
    },
  };
}

export function buildTenantRegisterRequest(
  payload: StudentRegisterPayload,
  slug: TenantSlug = getCurrentTenantSlug()
): TenantRegisterRequest {
  return {
    headers: {
      "X-Tenant-Slug": slug,
    },
    body: {
      ...payload,
      tenantSlug: slug,
    },
  };
}
