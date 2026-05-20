import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins/organization'

import { env } from '@narada/env'
import { db } from '@narada/db'
import { acl, owner, admin, member } from './permissions'

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
      ac: acl,
      roles: { owner, admin, member },
      teams: {
        enabled: true,
      },
    }),
  ],
})
