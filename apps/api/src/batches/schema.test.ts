import { describe, expect, it, vi } from 'vitest'

import { CreateBatchSchema, SetClassSlotsSchema, UpdateBatchSchema } from './schema'

// Explicit factory (rather than the real module) so importing `./schema` doesn't pull in
// `@narada/db` at import time and trigger real env-var validation — never loads.
vi.mock('@narada/db', () => ({
  batchStatus: { enumValues: ['upcoming', 'active', 'completed'] },
  enrollmentRole: { enumValues: ['instructor', 'ta', 'student'] },
  enrollmentStatus: { enumValues: ['active', 'break', 'dropped', 'inactive'] },
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

  // A batch's track is set once at creation — the real API never allowed moving it (§9.4).
  // Zod's default is to strip unrecognized keys, not reject them, so a `trackId` in the body
  // parses fine but never reaches the service/DB — this documents that stripping, not a 400.
  it('strips a trackId in the body rather than accepting or rejecting it', () => {
    const result = UpdateBatchSchema.safeParse({ trackId, code: 'B1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('trackId')
      expect(result.data).toEqual({ code: 'B1' })
    }
  })
})

describe('SetClassSlotsSchema', () => {
  const slot = (dayOfWeek: number, time = '09:00') => ({ dayOfWeek, time, durationMinutes: 60 })

  it('accepts an empty slot list', () => {
    expect(SetClassSlotsSchema.safeParse({ slots: [] }).success).toBe(true)
  })

  it('accepts up to seven slots, one per day', () => {
    const slots = Array.from({ length: 7 }, (_, day) => slot(day))
    expect(SetClassSlotsSchema.safeParse({ slots }).success).toBe(true)
  })

  it('rejects more than seven slots', () => {
    const slots = [...Array.from({ length: 7 }, (_, day) => slot(day)), slot(0, '10:00')]
    const result = SetClassSlotsSchema.safeParse({ slots })
    expect(result.success).toBe(false)
  })

  it('rejects two slots on the same day of week', () => {
    const result = SetClassSlotsSchema.safeParse({
      slots: [slot(1, '09:00'), slot(1, '15:00')],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/one class slot per day/)
    }
  })

  it('rejects dayOfWeek outside 0-6', () => {
    expect(SetClassSlotsSchema.safeParse({ slots: [slot(-1)] }).success).toBe(false)
    expect(SetClassSlotsSchema.safeParse({ slots: [slot(7)] }).success).toBe(false)
  })

  it('rejects a malformed time string', () => {
    expect(SetClassSlotsSchema.safeParse({ slots: [slot(0, '9:00')] }).success).toBe(false)
    expect(SetClassSlotsSchema.safeParse({ slots: [slot(0, '24:00')] }).success).toBe(false)
    expect(SetClassSlotsSchema.safeParse({ slots: [slot(0, '09:60')] }).success).toBe(false)
  })

  it('accepts strict 24-hour HH:MM boundaries', () => {
    expect(SetClassSlotsSchema.safeParse({ slots: [slot(0, '00:00')] }).success).toBe(true)
    expect(SetClassSlotsSchema.safeParse({ slots: [slot(0, '23:59')] }).success).toBe(true)
  })

  it('rejects a non-positive durationMinutes', () => {
    const result = SetClassSlotsSchema.safeParse({ slots: [{ dayOfWeek: 0, time: '09:00', durationMinutes: 0 }] })
    expect(result.success).toBe(false)
  })
})
