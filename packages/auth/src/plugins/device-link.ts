import { randomInt } from 'crypto'
import { and, eq, inArray, lte } from 'drizzle-orm'
import { APIError, createAuthEndpoint, sensitiveSessionMiddleware } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import * as z from 'zod'

import { publicDb, deviceLinkCode } from '@narada/db'

/**
 * Links a brand-new, unauthenticated device to an already-signed-in account with no OTP — the
 * standard direction for this pattern (code shown on the new device, approved from a trusted
 * one), not the reverse. Four endpoints:
 *
 *   start   (unauth)  — the new device asks for a code.
 *   lookup  (auth)     — the trusted device previews what it's about to approve.
 *   approve (auth)     — the trusted device commits.
 *   poll    (unauth)  — the new device's own repeated call; this is what actually creates and
 *                        cookies its session, since only a response to the new device's own
 *                        request can set a cookie in the new device's own jar.
 *
 * Everything here reads/writes `deviceLinkCode` directly through `publicDb` (plain Drizzle, the
 * same style `stagedUpload`'s repository uses in apps/api) rather than going through
 * BetterAuth's generic `ctx.context.adapter` model layer — this app doesn't abstract its database
 * away anywhere else, and a table only this plugin ever touches doesn't need to start.
 * `ctx.context.internalAdapter`/`setSessionCookie`/`sensitiveSessionMiddleware` are the only
 * BetterAuth internals actually needed, for the one thing only they can do: create a session and
 * set its cookie, and read the caller's own existing session.
 *
 * `lookup`/`approve` use `sensitiveSessionMiddleware`, not the plain `sessionMiddleware`: approving
 * a code hands a brand-new device a year-long session, so the caller's session has to be checked
 * against the database on every call rather than trusted from BetterAuth's cached `session_data`
 * cookie (`packages/auth/src/index.ts`'s `cookieCache`, up to 5 minutes stale). Without this, a
 * device revoked from Settings moments earlier could keep approving new device links until its
 * cache window ran out.
 */

// Crockford's Base32 alphabet — no 0/O or 1/I/L confusion, chosen for a code read off one screen
// and typed on another, not for any formal base-32 property.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const CODE_LENGTH = 9
const CODE_CREATE_ATTEMPTS = 5 // retries on the astronomically unlikely unique-code collision

const EXPIRY_MS = 10 * 60 * 1000
// Failed `approve` attempts against one code — belt-and-suspenders alongside the endpoint's own
// per-IP rate limit (apps/api/src/utils/serverSecurity.ts), not the primary defense: at
// 32^9 combinations the code itself is already far past brute-forceable.
const MAX_ATTEMPTS = 20

function generateCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  }
  return code
}

/** A code usable right now: exists, still `pending`, not past its own `expiresAt`. */
async function findUsableCode(code: string) {
  const row = await publicDb.query.deviceLinkCode.findFirst({
    where: (t, { eq }) => eq(t.code, code),
  })
  if (!row) return null
  if (row.status !== 'pending') return null
  if (row.expiresAt <= new Date()) {
    await publicDb.update(deviceLinkCode).set({ status: 'expired' }).where(eq(deviceLinkCode.id, row.id))
    return null
  }
  return row
}

/** Records a failed `approve` attempt against a code that was found but rejected for some other
 * reason (wrong status by the time this runs, race with another approval, etc.) — a no-op if the
 * code doesn't exist at all, since there's nothing to attach the attempt to. */
async function recordFailedAttempt(code: string): Promise<void> {
  const row = await publicDb.query.deviceLinkCode.findFirst({ where: (t, { eq }) => eq(t.code, code) })
  if (!row) return
  const attempts = row.attempts + 1
  await publicDb
    .update(deviceLinkCode)
    .set(attempts >= MAX_ATTEMPTS ? { attempts, status: 'expired' } : { attempts })
    .where(eq(deviceLinkCode.id, row.id))
}

const start = createAuthEndpoint(
  '/device-link/start',
  { method: 'POST' },
  async ctx => {
    const requestUserAgent = ctx.headers?.get('user-agent') ?? null
    const expiresAt = new Date(Date.now() + EXPIRY_MS)

    for (let attempt = 0; attempt < CODE_CREATE_ATTEMPTS; attempt++) {
      try {
        const [row] = await publicDb
          .insert(deviceLinkCode)
          .values({ code: generateCode(), expiresAt, requestUserAgent })
          .returning()
        if (!row) {
          throw APIError.from('INTERNAL_SERVER_ERROR', {
            code: 'DEVICE_LINK_CREATE_FAILED',
            message: 'failed to create device link code',
          })
        }
        return ctx.json({ id: row.id, code: row.code, expiresAt: row.expiresAt.toISOString() })
      } catch (err) {
        // A real (if vanishingly unlikely) unique-constraint hit on `code` — anything else
        // shouldn't be swallowed by a blind retry loop.
        const isUniqueViolation = err instanceof Error && 'code' in err && err.code === '23505'
        if (!isUniqueViolation) throw err
      }
    }
    throw APIError.from('INTERNAL_SERVER_ERROR', {
      code: 'DEVICE_LINK_CREATE_FAILED',
      message: 'could not generate a unique device link code',
    })
  },
)

const lookup = createAuthEndpoint(
  '/device-link/lookup',
  {
    method: 'GET',
    query: z.object({ code: z.string().min(1) }),
    use: [sensitiveSessionMiddleware],
  },
  async ctx => {
    const row = await findUsableCode(ctx.query.code)
    if (!row) {
      throw APIError.from('NOT_FOUND', {
        code: 'DEVICE_LINK_CODE_INVALID',
        message: 'this code is invalid, already used, or has expired',
      })
    }
    return ctx.json({ requestUserAgent: row.requestUserAgent, createdAt: row.createdAt.toISOString() })
  },
)

const approve = createAuthEndpoint(
  '/device-link/approve',
  {
    method: 'POST',
    body: z.object({ code: z.string().min(1) }),
    use: [sensitiveSessionMiddleware],
  },
  async ctx => {
    const row = await findUsableCode(ctx.body.code)
    if (!row) {
      await recordFailedAttempt(ctx.body.code)
      throw APIError.from('NOT_FOUND', {
        code: 'DEVICE_LINK_CODE_INVALID',
        message: 'this code is invalid, already used, or has expired',
      })
    }
    await publicDb
      .update(deviceLinkCode)
      .set({ userId: ctx.context.session.user.id, status: 'approved', approvedAt: new Date() })
      .where(eq(deviceLinkCode.id, row.id))
    return ctx.json({ status: 'approved' as const })
  },
)

const poll = createAuthEndpoint(
  '/device-link/poll',
  {
    method: 'POST',
    body: z.object({ id: z.string().min(1) }),
  },
  async ctx => {
    // The atomic hinge: only the request whose UPDATE actually matches a still-`approved` row
    // gets to create the session, so a retried or overlapping poll can never double-claim one
    // approval — everyone else just learns the current status below.
    const [claimed] = await publicDb
      .update(deviceLinkCode)
      .set({ status: 'claimed', claimedAt: new Date() })
      .where(and(eq(deviceLinkCode.id, ctx.body.id), eq(deviceLinkCode.status, 'approved')))
      .returning()

    if (claimed) {
      if (!claimed.userId) {
        throw APIError.from('INTERNAL_SERVER_ERROR', {
          code: 'DEVICE_LINK_INVALID_STATE',
          message: 'approved device link has no user',
        })
      }
      const session = await ctx.context.internalAdapter.createSession(claimed.userId)
      const user = await ctx.context.internalAdapter.findUserById(claimed.userId)
      if (!user) {
        throw APIError.from('NOT_FOUND', {
          code: 'DEVICE_LINK_USER_NOT_FOUND',
          message: 'the linked account no longer exists',
        })
      }
      await publicDb
        .update(deviceLinkCode)
        .set({ claimedSessionId: session.id })
        .where(eq(deviceLinkCode.id, claimed.id))
      await setSessionCookie(ctx, { session, user })
      return ctx.json({ status: 'claimed' as const })
    }

    const row = await publicDb.query.deviceLinkCode.findFirst({
      where: (t, { eq }) => eq(t.id, ctx.body.id),
    })
    if (!row) {
      throw APIError.from('NOT_FOUND', { code: 'DEVICE_LINK_NOT_FOUND', message: 'device link not found' })
    }
    if (row.status === 'pending' && row.expiresAt <= new Date()) {
      await publicDb.update(deviceLinkCode).set({ status: 'expired' }).where(eq(deviceLinkCode.id, row.id))
      return ctx.json({ status: 'expired' as const })
    }
    return ctx.json({ status: row.status })
  },
)

export const deviceLink = () => ({
  id: 'device-link',
  endpoints: { deviceLinkStart: start, deviceLinkLookup: lookup, deviceLinkApprove: approve, deviceLinkPoll: poll },
})

/**
 * A code nobody ever finished with — never approved, or approved but the new device never came
 * back to poll — sits in `pending`/`approved` forever with nothing else to revisit it (the same
 * gap `stagedUpload`'s own sweep exists for in apps/api). Lives in the shared public schema,
 * not per-school, so — unlike `sweepExpiredStagedUploads` — this is one query, no per-organization
 * loop. Returns the number of rows expired.
 */
export async function sweepExpiredDeviceLinkCodes(): Promise<number> {
  const result = await publicDb
    .update(deviceLinkCode)
    .set({ status: 'expired' })
    .where(and(inArray(deviceLinkCode.status, ['pending', 'approved']), lte(deviceLinkCode.expiresAt, new Date())))
    .returning({ id: deviceLinkCode.id })
  return result.length
}
