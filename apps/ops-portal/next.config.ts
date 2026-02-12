import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@narada/ui"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
