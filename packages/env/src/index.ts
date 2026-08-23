import { createEnv } from '@t3-oss/env-core'
import * as z from 'zod'

export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(3000),
    API_BASE_URL: z.url(),
    API_VERSION: z.coerce.number(),
    DATABASE_URL: z.url(),
    // Not validated as z.url() because staging allows wildcard host patterns
    // (e.g. "https://web-*-gurukrupa-vedic.vercel.app") to match Vercel preview deployments.
    TRUSTED_ORIGINS: z
      .string()
      .transform(origins => origins.split(','))
      .pipe(z.array(z.string().min(1)))
      .default([]),

    AUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    R2_ACCOUNT_ID: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_ACCESS_KEY: z.string(),
    R2_BUCKET_NAME: z.string(),
  },
  clientPrefix: 'NEXT_PUBLIC',
  client: {
    NEXT_PUBLIC_API_URL: z.url(),
    NEXT_PUBLIC_SCHOOL_SLUG: z.string(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
