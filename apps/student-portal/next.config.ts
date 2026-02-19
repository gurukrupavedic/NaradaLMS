import type { NextConfig } from "next";

// Derive API server origin for rewrites (e.g. http://localhost:5000/api -> http://localhost:5000)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, "") || "http://localhost:5000";

const nextConfig: NextConfig = {
  transpilePackages: ["@narada/ui"],
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
