import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { env } from '@narada/env'
import { db } from '@narada/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', camelCase: true }),
  secret: env.AUTH_SECRET,
  baseURL: env.API_BASE_URL,
  basePath: `/v${env.API_VERSION}/auth`,
  emailAndPassword: { enabled: true },
  trustedOrigins: env.TRUSTED_ORIGINS,
  session: {
    cookieCache: { enabled: true, maxAge: 300 },
  },
})
