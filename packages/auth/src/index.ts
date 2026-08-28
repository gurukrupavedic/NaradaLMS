import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins/organization'
import { phoneNumber } from 'better-auth/plugins/phone-number'
import { env } from '@narada/env'
import { publicDb } from '@narada/db'
import { sendOtpMessage, verifyOtpCode } from '@narada/otp'
import { ac, owner, admin, member } from './permissions/school'

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
  ],
})
