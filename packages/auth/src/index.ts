import { betterAuth } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins/organization'
import { phoneNumber } from 'better-auth/plugins/phone-number'
import { env } from '@narada/env'
import { publicDb } from '@narada/db'
import { sendOtpMessage, verifyOtpCode } from '@narada/otp'
import { ac, owner, admin, member } from './permissions/school'
import { deviceLink } from './plugins/device-link'

export { sweepExpiredDeviceLinkCodes } from './plugins/device-link'

/**
 * OAuth's authorization/callback redirect_uri has to exactly match on both legs of the code
 * exchange, and better-auth builds it from `baseURL` (`env.API_BASE_URL` — apps/api's own
 * origin). But the browser never talks to apps/api directly: apps/web's proxy.ts rewrite proxies
 * `/v1/*` through so the session cookie lands same-origin with the frontend, not apps/api's domain
 * (see that file's comment, and lib/auth/client.ts). Google's redirect back after consent is a
 * plain top-level browser navigation, though — it isn't proxied, so it always lands wherever
 * `redirect_uri` pointed, which was apps/api's origin, bypassing apps/web (and the cookie jar the
 * OAuth state cookie was set in) entirely. The state itself still validates fine (it's
 * round-tripped through Google in the `state` param and checked against a DB row), but the paired
 * verification cookie never arrives, so better-auth's secondary check fails with `state_mismatch`.
 *
 * The fix: build `redirect_uri` from the origin the browser is actually on rather than from
 * apps/api's own baseURL, so Google's redirect lands back on apps/web and the state cookie rides
 * along through the proxy like every other request. better-auth has a built-in mechanism for
 * exactly this (`baseURL`'s dynamic-object form + `advanced.trustedProxyHeaders`, reading
 * `X-Forwarded-Host`) — tried first, but verified in production that the reverse proxy fronting
 * apps/api doesn't forward that header unmodified, so better-auth never saw the real origin. This
 * uses `x-app-origin` instead: a header apps/web's own proxy.ts stamps from the request it actually
 * received, on every `/v1/*` call, and never reads back from (or lets through from) the incoming
 * request — so it can't be forged by a caller hitting apps/api directly. Only kicks in for an
 * origin already in `trustedOrigins`; anything else (e.g. hitting apps/api directly) keeps the
 * default apps/api-origin behavior.
 *
 * Each such origin (every apps/web dev port, each Vercel deployment domain) needs its own
 * `.../v1/auth/callback/google` registered as an authorized redirect URI in Google Cloud
 * Console — Google rejects a `redirect_uri` it doesn't recognize before this code ever runs.
 */
function trustProxiedOAuthOrigin() {
  return createAuthMiddleware(async ctx => {
    if (ctx.path !== '/sign-in/social' && ctx.path !== '/callback/:id') return
    const origin = ctx.request?.headers.get('x-app-origin')
    if (!origin || !ctx.context.isTrustedOrigin(origin)) return
    ctx.context.baseURL = `${origin}${ctx.context.options.basePath}`
  })
}

export const auth = betterAuth({
  database: drizzleAdapter(publicDb, { provider: 'pg', camelCase: true }),
  secret: env.AUTH_SECRET,
  baseURL: env.API_BASE_URL,
  basePath: `/v${env.API_VERSION}/auth`,
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  trustedOrigins: env.TRUSTED_ORIGINS,
  hooks: {
    before: trustProxiedOAuthOrigin(),
  },
  session: {
    // A shared household phone number re-entering an OTP on every device, every week (the
    // unset-`expiresIn` default) is exactly the SMS cost and friction this is meant to cut —
    // once a device is signed in, it stays signed in for a year. `updateAge` (the sliding-renewal
    // window) moves out to match: a session touched at all in the last week just keeps its year,
    // rather than writing a renewal on every single request.
    expiresIn: 60 * 60 * 24 * 365,
    updateAge: 60 * 60 * 24 * 7,
    // better-auth's own `/list-sessions` (used by Settings' linked-devices list) 403s unless the
    // session was *created*, not just active, within `freshAge` — 24h by default. With sessions
    // now living a year, that's every session after its first day. There's no password or
    // sensitive-settings flow here for that freshness check to protect, so it's off rather than
    // silently breaking the device list for anyone who signed in more than a day ago.
    freshAge: 0,
    // Every request through apps/api validates its session against this cache before ever
    // touching the database (session.ts), so its length is also how long a session revoked from
    // Settings' linked-devices list keeps working elsewhere — accepted as a deliberate trade-off
    // in favor of keeping the cache's benefit for ordinary traffic, rather than shortening the
    // window or forcing a DB check on every request. Endpoints that grant something sensitive
    // (packages/auth/src/plugins/device-link.ts's `lookup`/`approve`) still force an authoritative
    // check regardless, via `sensitiveSessionMiddleware`.
    cookieCache: { enabled: true, maxAge: 300 },
  },
  user: {
    additionalFields: {
      isSuperAdmin: {
        type: 'boolean',
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [
    organization({
      ac: ac,
      roles: { owner, admin, member },
    }),
    phoneNumber({
      // @narada/otp generates and owns the code itself (so the `code` this plugin would otherwise
      // generate locally is unused) — Twilio here is just an SMS delivery channel for it.
      sendOTP: async ({ phoneNumber }) => {
        await sendOtpMessage(phoneNumber)
      },
      // Verified against the code @narada/otp generated and stored, not Twilio's own check
      // endpoint, since Twilio no longer picks the code.
      verifyOTP: async ({ phoneNumber, code }) => {
        return verifyOtpCode(phoneNumber, code)
      },
      phoneNumberValidator: value => /^\+[1-9]\d{7,14}$/.test(value), // E.164
      requireVerification: false,
    }),
    deviceLink(),
  ],
})
