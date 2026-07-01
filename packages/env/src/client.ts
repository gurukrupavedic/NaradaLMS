import { createEnv } from '@t3-oss/env-core'
import * as z from 'zod'

export const env = createEnv({
  clientPrefix: 'NEXT_PUBLIC',
  client: {
    NEXT_PUBLIC_API_URL: z.url(),
    NEXT_PUBLIC_SCHOOL_SLUG: z.string(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SCHOOL_SLUG: process.env.NEXT_PUBLIC_SCHOOL_SLUG,
  },
  emptyStringAsUndefined: true,
})
