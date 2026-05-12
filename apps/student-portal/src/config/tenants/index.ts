import { rrTenantConfig } from "./rr";
import { slmtsTenantConfig } from "./slmts";

export type TenantSlug = "slmts" | "rr";

export interface TenantConfig {
  slug: TenantSlug;
  displayName: string;
  authHeading: string;
  tagline: string;
  logoPath: string;
  logoAlt: string;
  iconPath: string;
  metadataTitle: string;
  metadataDescription: string;
}

export const DEFAULT_TENANT_SLUG: TenantSlug = "slmts";

export const TENANT_CONFIGS: Record<TenantSlug, TenantConfig> = {
  slmts: slmtsTenantConfig,
  rr: rrTenantConfig,
};
