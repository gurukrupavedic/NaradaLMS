import { describe, expect, it, vi } from 'vitest'

vi.mock('@narada/db', () => ({ JAPAM_DAILY_MAX: 1_000_000 }))

import { FindJapamSchema, JapamDayParamsSchema, LogJapamSchema, SetJapamDaySchema } from './schema'

describe('LogJapamSchema', () => {
  it('takes a positive whole count and an optional date', () => {
    expect(LogJapamSchema.safeParse({ count: 108 }).success).toBe(true)
    expect(LogJapamSchema.safeParse({ count: 108, loggedOn: '2026-02-20' }).success).toBe(true)
  })

  it('rejects zero, negatives, fractions, and anything above the daily cap', () => {
    for (const count of [0, -1, 1.5, 1_000_001, '108', null]) {
      expect(LogJapamSchema.safeParse({ count }).success).toBe(false)
    }
    expect(LogJapamSchema.safeParse({ count: 1_000_000 }).success).toBe(true)
  })

  it('rejects a date that is not a real calendar day, or is implausibly old', () => {
    for (const loggedOn of ['2026-02-30', '2026-2-3', '20260203', '1999-12-31', '']) {
      expect(LogJapamSchema.safeParse({ count: 1, loggedOn }).success).toBe(false)
    }
  })
})

describe('SetJapamDaySchema', () => {
  it('allows zero, to clear a day', () => {
    expect(SetJapamDaySchema.safeParse({ count: 0 }).success).toBe(true)
    expect(SetJapamDaySchema.safeParse({ count: -1 }).success).toBe(false)
    expect(SetJapamDaySchema.safeParse({}).success).toBe(false)
  })
})

describe('FindJapamSchema', () => {
  it('takes either bound, both, or neither', () => {
    expect(FindJapamSchema.safeParse({}).success).toBe(true)
    expect(FindJapamSchema.safeParse({ from: '2026-01-01' }).success).toBe(true)
    expect(FindJapamSchema.safeParse({ from: '2026-01-01', to: '2026-01-01' }).success).toBe(true)
  })

  it('rejects a window that ends before it starts', () => {
    expect(FindJapamSchema.safeParse({ from: '2026-02-01', to: '2026-01-01' }).success).toBe(false)
  })
})

describe('JapamDayParamsSchema', () => {
  it('needs a profile id and a real date', () => {
    const profileId = '11111111-1111-4111-8111-111111111111'
    expect(JapamDayParamsSchema.safeParse({ profileId, loggedOn: '2026-02-20' }).success).toBe(true)
    expect(JapamDayParamsSchema.safeParse({ profileId, loggedOn: 'yesterday' }).success).toBe(false)
  })
})
