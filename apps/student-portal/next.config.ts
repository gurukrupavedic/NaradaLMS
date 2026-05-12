import type { NextConfig } from "next";
import { getTenantBuildDirectory, resolveTenantSlug } from "./src/config/tenants";

// Derive API server origin for rewrites (e.g. http://localhost:5000/api -> http://localhost:5000)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, "") || "http://localhost:5000";
const TENANT_SLUG = resolveTenantSlug(
  process.env.NEXT_PUBLIC_TENANT ?? process.env.TENANT
);

const nextConfig: NextConfig = {
  transpilePackages: ["@narada/ui"],
  distDir: getTenantBuildDirectory(TENANT_SLUG),
  env: {
    NEXT_PUBLIC_TENANT: TENANT_SLUG,
  },
  experimental: {
    // reactCompiler: true,
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${API_SERVER_ORIGIN}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
