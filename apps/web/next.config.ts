import type { NextConfig } from "next";

// API_BASE_URL is the real apps/api origin (e.g. http://localhost:3000/v1), read
// server-side only (Node evaluates this file directly — it never reaches the browser
// bundle). Every browser-initiated call, auth included, hits this app's own /v1/* path
// instead of that origin directly: better-auth's session cookie then gets set same-origin
// with this app rather than cross-origin on the API's own domain, and reads/writes never
// need CORS. Mirrors the identical rewrite in apps/web-legacy's own next.config.ts.
const apiUrl = process.env.API_BASE_URL;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets an ngrok-tunneled phone actually load the dev server: Next blocks cross-origin requests
  // to its own dev-only resources by default (`block-cross-site-dev.js`), which includes the HMR
  // websocket at `/_next/webpack-hmr`. Without this, that socket 403s from any origin outside
  // localhost, and the dev client's reload-on-broken-HMR fallback then reloads the page in a loop
  // — every mount effect (session check, device-link code fetch) gets killed mid-flight before it
  // can ever finish, which looks like the page is silently stuck rather than erroring.
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.app', '*.ngrok.io'],
  async rewrites() {
    if (!apiUrl) return [];
    return [{ source: "/v1/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
