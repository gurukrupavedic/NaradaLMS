import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@narada/ui"],
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5000/uploads/:path*',
      },
      // Proxy API requests to backend during development to avoid CORS issues if needed,
      // though client code currently hardcodes localhost:5000
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
