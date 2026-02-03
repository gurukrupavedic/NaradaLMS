import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@narada/ui"],
  experimental: {
    // reactCompiler: true, 
  }
};

export default nextConfig;
