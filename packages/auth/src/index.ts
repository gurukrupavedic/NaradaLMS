import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins/organization'
import { phoneNumber } from 'better-auth/plugins/phone-number'
import { env } from '@narada/env'
import { publicDb } from '@narada/db'
import { sendOtpMessage, verifyOtpCode } from '@narada/otp'
import { ac, owner, admin, member } from './permissions/school'
import { deviceLink } from './plugins/device-link'

export { sweepExpiredDeviceLinkCodes } from './plugins/device-link'

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
      // Twilio Verify owns OTP generation and expiry itself, so the `code` this plugin would
      // otherwise generate locally is unused — sendOTP just triggers a Twilio Verify send.
      sendOTP: async ({ phoneNumber }) => {
        await sendOtpMessage(phoneNumber)
      },
      // Delegates verification to Twilio Verify's check endpoint instead of the plugin's
      // built-in code comparison, since Twilio never told us what code it sent.
      verifyOTP: async ({ phoneNumber, code }) => {
        return verifyOtpCode(phoneNumber, code)
      },
      phoneNumberValidator: value => /^\+[1-9]\d{7,14}$/.test(value), // E.164
      requireVerification: false,
    }),
    deviceLink(),
  ],
})
