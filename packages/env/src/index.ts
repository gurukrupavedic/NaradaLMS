import { createEnv } from '@t3-oss/env-core'
import * as z from 'zod'

export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(3000),
    API_BASE_URL: z.url(),
    API_VERSION: z.coerce.number(),
    DATABASE_URL: z.url(),
    TRUSTED_ORIGINS: z
      .string()
      .transform(origins => origins.split(','))
      .pipe(z.array(z.url()))
      .default([]),

    // Connection-pool budget and timeouts (DD-015). Defaults are conservative placeholders
    // pending real ops data (PostgreSQL max_connections, instance count, proxy presence);
    // tune via environment, not code. DB_MAX_LIFETIME_SECONDS 0 = disabled (pg's own default).
    DB_PUBLIC_POOL_MAX: z.coerce.number().int().positive().default(5),
    DB_SCHOOL_POOL_MAX: z.coerce.number().int().positive().default(3),
    DB_SCHOOL_POOL_CACHE_MAX: z.coerce.number().int().positive().default(10),
    DB_ACQUIRE_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    DB_MAX_LIFETIME_SECONDS: z.coerce.number().int().nonnegative().default(0),
    DB_READY_TIMEOUT_MS: z.coerce.number().int().positive().default(3_000),

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
