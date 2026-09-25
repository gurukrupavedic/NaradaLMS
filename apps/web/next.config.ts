import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript (no build step), which Next only compiles when told to.
  transpilePackages: ['@narada/profile-fields'],
  // Lets an ngrok-tunneled phone actually load the dev server: Next blocks cross-origin requests
  // to its own dev-only resources by default (`block-cross-site-dev.js`), which includes the HMR
  // websocket at `/_next/webpack-hmr`. Without this, that socket 403s from any origin outside
  // localhost, and the dev client's reload-on-broken-HMR fallback then reloads the page in a loop
  // — every mount effect (session check, device-link code fetch) gets killed mid-flight before it
  // can ever finish, which looks like the page is silently stuck rather than erroring.
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.app', '*.ngrok.io'],
  // The /v1/* -> apps/api rewrite that used to live here now happens in proxy.ts instead — a
  // proxy/middleware's request-header mutations (needed there for APP_ORIGIN_HEADER) don't
  // propagate into a rewrite defined here, since the two are separate layers in Next's request
  // pipeline. See proxy.ts's own comment.
};

export default nextConfig;
