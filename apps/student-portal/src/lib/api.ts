import { apiRequest as sharedApiRequest } from "@narada/api-client";
import type { FetchOptions } from "@narada/api-client";
import { getCurrentTenantSlug } from "./tenant";

export type { FetchOptions } from "@narada/api-client";

/**
 * Student portal API calls: forwards to shared client and adds `X-Tenant-Slug`
 * so `/api/learning/*` resolves org from the build tenant (Slice 5).
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  return sharedApiRequest<T>(endpoint, {
    ...options,
    headers: {
      "X-Tenant-Slug": getCurrentTenantSlug(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}
