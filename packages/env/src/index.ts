import { createEnv } from '@t3-oss/env-core'
import * as z from 'zod'

function reshapeTwilioConfig<
  T extends {
    USE_TWILIO_API: boolean
    TWILIO_ACCOUNT_SID?: string
    TWILIO_AUTH_TOKEN?: string
    TWILIO_VERIFY_SERVICE_SID?: string
  },
>(value: T, ctx: z.RefinementCtx) {
  const { USE_TWILIO_API, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID, ...rest } = value
  if (!USE_TWILIO_API) {
    return {
      ...rest,
      USE_TWILIO_API,
    }
  }

  const required = { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID }
  for (const [key, val] of Object.entries(required)) {
    if (!val) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: `${key} is required when USE_TWILIO_API is true`,
      })
    }
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    return z.NEVER
  }

  return {
    ...rest,
    USE_TWILIO_API,
    TWILIO: {
      ACCOUNT_SID: TWILIO_ACCOUNT_SID,
      AUTH_TOKEN: TWILIO_AUTH_TOKEN,
      VERIFY_SERVICE_SID: TWILIO_VERIFY_SERVICE_SID,
    },
  }
}

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

    USE_TWILIO_API: z.stringbool().default(false),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  },
  clientPrefix: 'NEXT_PUBLIC',
  client: {
    NEXT_PUBLIC_API_URL: z.url(),
    NEXT_PUBLIC_SCHOOL_SLUG: z.string(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  createFinalSchema: shape => z.object(shape).transform(reshapeTwilioConfig),
})
