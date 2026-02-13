import type { NextConfig } from "next";

const API_SERVER_URL = process.env.API_SERVER_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
  transpilePackages: ["@narada/ui"],
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${API_SERVER_URL}/uploads/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${API_SERVER_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
