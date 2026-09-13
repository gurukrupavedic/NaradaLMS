import '@narada/env/load'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { testUtils } from 'better-auth/plugins'

import { env } from '@narada/env'
import { publicDb, shutdownPools } from '@narada/db'

/**
 * Mints real, validly-signed BetterAuth session cookies for local dev personas, bypassing OTP —
 * the official better-auth pattern for this (see `better-auth/plugins/test-utils`'s docstring).
 * Used to drive apps/web/.draft-frontend against this real api server without a real login
 * flow (that workspace has none yet).
 *
 * Run from apps/api so `@narada/env/load` picks up the shared root `.env`:
 *   pnpm --filter @narada/api exec tsx scripts/mint-dev-sessions.ts
 *
 * Paste the printed cookie values into apps/web/.draft-frontend/.env.local's
 * STUDENT_SESSION_COOKIE / ADMIN_SESSION_COOKIE. Sessions last 7 days (better-auth's default) —
 * re-run this whenever they expire (calls start failing with 401).
 */
const testAuth = betterAuth({
  database: drizzleAdapter(publicDb, { provider: 'pg', camelCase: true }),
  secret: env.AUTH_SECRET,
  baseURL: env.API_BASE_URL,
  basePath: `/v${env.API_VERSION}/auth`,
  plugins: [testUtils()],
})

// Real profiles from the imported `slmts` dev database — a student with real evaluation history,
// and the school's real org admin. Swap these for other userIds if you want different personas;
// find one via `psql` against the `profile`/`user` tables in the school-<orgId> schema.
const PERSONAS: Record<string, string> = {
  student: '019fe868-fc2c-746d-982a-e14b63d78328', // Siva Rama Krishna Pochimcherla
  admin: '7Q6pJUGtpHva8s6CeMkM3jloq8hOf0gs', // Gurukrupa Vedic, org admin
}

async function main() {
  const ctx = await testAuth.$context
  const test = (
    ctx as unknown as {
      test: { login: (o: { userId: string }) => Promise<{ headers: Headers }> }
    }
  ).test

  for (const [name, userId] of Object.entries(PERSONAS)) {
    const { headers } = await test.login({ userId })
    console.log(`${name.toUpperCase()}_SESSION_COOKIE=${headers.get('cookie')}`)
  }

  await shutdownPools()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
