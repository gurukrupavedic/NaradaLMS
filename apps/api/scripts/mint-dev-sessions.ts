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

// Real profiles from the imported `slmts` dev database. These ids are only stable until the next
// `import-school.ts data --commit` re-import, which regenerates every id from scratch
// (tools/src/parse-excel-to-json.ts's ids are not deterministic across runs) — swap in fresh ones
// from `psql` against the `profile`/`user` tables in the school-<orgId> schema whenever this
// starts failing with "no user found".
//
// `teacher` is a real instructor with their own phone number — parse-excel-to-json.ts used to
// give every "GURUVU GARU" name a brand-new, phone-less identity even when that same person had
// already registered as a student elsewhere in the sheet; it now unifies those by exact name
// match (see getOrCreateTeacher's own doc comment), so a real teacher persona exists at all now.
//
// `admin` is a manually-promoted super admin (`UPDATE "user" SET "isSuperAdmin" = true ...`) — a
// plain `import-school.ts data` import grants every roster user the same 'member' org role, never
// an owner/admin, so this bypass is what stands in for one until a real admin account is set up.
const PERSONAS: Record<string, string> = {
  student: '01a09965-6726-7199-8331-bcb5f8e51fcb', // Harish Kumar Cherukuru
  teacher: '01a09965-6727-72ff-96ec-c6a6790caa51', // Chakravarthy Panchagnula
  admin: '01a09965-6727-72ff-96ec-6e25f945face', // Revanth Pothukuchi (super admin)
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
