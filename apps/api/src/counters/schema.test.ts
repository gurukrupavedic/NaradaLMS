import { describe, expect, it, vi } from 'vitest'

vi.mock('@narada/db', () => ({ COUNTER_DAILY_MAX: 1_000_000 }))

import {
  CounterDayParamsSchema,
  FindCounterSchema,
  LogCounterSchema,
  SetCounterDaySchema,
} from './schema'

describe('LogCounterSchema', () => {
  it('takes a positive whole count and an optional date', () => {
    expect(LogCounterSchema.safeParse({ count: 108 }).success).toBe(true)
    expect(LogCounterSchema.safeParse({ count: 108, loggedOn: '2026-02-20' }).success).toBe(true)
  })

  it('rejects zero, negatives, fractions, and anything above the daily cap', () => {
    for (const count of [0, -1, 1.5, 1_000_001, '108', null]) {
      expect(LogCounterSchema.safeParse({ count }).success).toBe(false)
    }
    expect(LogCounterSchema.safeParse({ count: 1_000_000 }).success).toBe(true)
  })

  it('rejects a date that is not a real calendar day, or is implausibly old', () => {
    for (const loggedOn of ['2026-02-30', '2026-2-3', '20260203', '1999-12-31', '']) {
      expect(LogCounterSchema.safeParse({ count: 1, loggedOn }).success).toBe(false)
    }
  })
})

describe('SetCounterDaySchema', () => {
  it('allows zero, to clear a day', () => {
    expect(SetCounterDaySchema.safeParse({ count: 0 }).success).toBe(true)
    expect(SetCounterDaySchema.safeParse({ count: -1 }).success).toBe(false)
    expect(SetCounterDaySchema.safeParse({}).success).toBe(false)
  })
})

describe('FindCounterSchema', () => {
  it('takes either bound, both, or neither', () => {
    expect(FindCounterSchema.safeParse({}).success).toBe(true)
    expect(FindCounterSchema.safeParse({ from: '2026-01-01' }).success).toBe(true)
    expect(FindCounterSchema.safeParse({ from: '2026-01-01', to: '2026-01-01' }).success).toBe(true)
  })

  it('rejects a window that ends before it starts', () => {
    expect(FindCounterSchema.safeParse({ from: '2026-02-01', to: '2026-01-01' }).success).toBe(
      false,
    )
  })
})

describe('CounterDayParamsSchema', () => {
  it('needs a profile id, a counter key and a real date', () => {
    const profileId = '11111111-1111-4111-8111-111111111111'
    const ok = { profileId, key: 'japam', loggedOn: '2026-02-20' }
    expect(CounterDayParamsSchema.safeParse(ok).success).toBe(true)
    expect(CounterDayParamsSchema.safeParse({ ...ok, loggedOn: 'yesterday' }).success).toBe(false)
    expect(CounterDayParamsSchema.safeParse({ ...ok, key: '' }).success).toBe(false)
  })
})
