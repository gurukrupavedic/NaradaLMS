import { createEnv } from '@t3-oss/env-core'
import * as z from 'zod'

export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(3000),
    API_BASE_URL: z.url(),
    DATABASE_URL: z.url(),
    TRUSTED_ORIGINS: z
      .string()
      .transform(origins => origins.split(','))
      .pipe(z.array(z.url()))
      .default([]),

    AUTH_SECRET: z.string().min(32),
  },
  clientPrefix: 'NEXT_PUBLIC',
  client: {
    NEXT_PUBLIC_API_URL: z.url(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
