import type { NextConfig } from 'next'

// NEXT_PUBLIC_API_URL is the API's absolute origin (e.g. https://api.example.com/v1),
// used directly by server-side code (lib/api.ts, lib/auth.ts). The browser never calls
// it directly — browser-initiated auth calls (packages/auth/src/client.ts) hit this
// app's own /v1/* path instead, which this rewrite proxies to the real API, so
// better-auth's session cookie is set same-origin with the app rather than
// cross-origin on the API's own domain.
const apiUrl = process.env.NEXT_PUBLIC_API_URL

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiUrl) return []
    return [{ source: '/v1/:path*', destination: `${apiUrl}/:path*` }]
  },
}

export default nextConfig
