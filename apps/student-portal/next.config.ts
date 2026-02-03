import type { NextConfig } from "next";

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
};

export default nextConfig;
