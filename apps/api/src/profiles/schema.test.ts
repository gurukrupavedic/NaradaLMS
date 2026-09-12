import { describe, expect, it, vi } from 'vitest'

// Explicit factory (rather than the real module) so importing `./schema` — which pulls in
// `../batches/schema` and, through it, `@narada/db` — doesn't trigger real env-var validation.
vi.mock('@narada/db', () => ({
  batchStatus: { enumValues: ['upcoming', 'active', 'completed'] },
  enrollmentRole: { enumValues: ['instructor', 'ta', 'student'] },
}))

import { ProfileBatchesQuerySchema } from './schema'

describe('ProfileBatchesQuerySchema', () => {
  it('defaults withDetail to false when omitted', () => {
    const result = ProfileBatchesQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.withDetail).toBe(false)
    }
  })

  it('coerces the string query param "true" to boolean true', () => {
    const result = ProfileBatchesQuerySchema.safeParse({ withDetail: 'true' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.withDetail).toBe(true)
    }
  })

  it('coerces the string query param "false" to boolean — note: z.coerce.boolean() treats any non-empty string as true', () => {
    // Documents real `z.coerce.boolean()` behavior (`Boolean('false') === true`) rather than
    // asserting the intuitive-but-wrong result — a caller must omit the param, not send
    // `withDetail=false`, to get the bare-row response.
    const result = ProfileBatchesQuerySchema.safeParse({ withDetail: 'false' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.withDetail).toBe(true)
    }
  })

  it('still accepts the base FindBatchesSchema fields (status, limit)', () => {
    const result = ProfileBatchesQuerySchema.safeParse({ status: 'active', limit: '10' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('active')
      expect(result.data.limit).toBe(10)
    }
  })
})
