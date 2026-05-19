import { createEnv } from '@t3-oss/env-core'
import * as z from 'zod'

export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    TRUSTED_ORIGINS: z
      .string()
      .transform(origins => origins.split(','))
      .pipe(z.array(z.url()))
      .default([]),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
