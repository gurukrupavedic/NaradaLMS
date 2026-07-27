import { describe, expect, it, vi } from 'vitest'

import { CreateBatchSchema, UpdateBatchSchema } from './schema'

// Explicit factory (rather than the real module) so importing `./schema` doesn't pull in
// `@narada/db` at import time and trigger real env-var validation — never loads.
vi.mock('@narada/db', () => ({
  batchStatus: { enumValues: ['upcoming', 'active', 'completed'] },
}))

const trackId = crypto.randomUUID()

describe('CreateBatchSchema', () => {
  it('accepts a valid body with startDate and meetingUrl', () => {
    const result = CreateBatchSchema.safeParse({
      trackId,
      code: 'B1',
      startDate: '2024-01-01T00:00:00Z',
      meetingUrl: 'https://zoom.us/j/123',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null startDate and meetingUrl', () => {
    const result = CreateBatchSchema.safeParse({
      trackId,
      code: 'B1',
      startDate: null,
      meetingUrl: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts omitted startDate and meetingUrl', () => {
    const result = CreateBatchSchema.safeParse({ trackId, code: 'B1' })
    expect(result.success).toBe(true)
  })

  it('rejects a date-only startDate', () => {
    const result = CreateBatchSchema.safeParse({
      trackId,
      code: 'B1',
      startDate: '2024-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a plain http meetingUrl', () => {
    const result = CreateBatchSchema.safeParse({
      trackId,
      code: 'B1',
      meetingUrl: 'http://zoom.us/j/123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a javascript: meetingUrl', () => {
    const result = CreateBatchSchema.safeParse({
      trackId,
      code: 'B1',
      meetingUrl: 'javascript:alert(1)',
    })
    expect(result.success).toBe(false)
  })
})

describe('UpdateBatchSchema', () => {
  it('rejects a plain http meetingUrl', () => {
    const result = UpdateBatchSchema.safeParse({ meetingUrl: 'http://host' })
    expect(result.success).toBe(false)
  })

  it('accepts an https meetingUrl', () => {
    const result = UpdateBatchSchema.safeParse({ meetingUrl: 'https://host/x' })
    expect(result.success).toBe(true)
  })
})
