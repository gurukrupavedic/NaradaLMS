import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins/organization'
import { env } from '@narada/env'
import { publicDb } from '@narada/db'
import { ac, owner, admin, member } from './permissions/school'

export const auth = betterAuth({
  database: drizzleAdapter(publicDb, { provider: 'pg', camelCase: true }),
  secret: env.AUTH_SECRET,
  baseURL: env.API_BASE_URL,
  basePath: `/v${env.API_VERSION}/auth`,
  emailAndPassword: { enabled: true },
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
  ],
})
