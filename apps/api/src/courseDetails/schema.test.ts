import { describe, expect, it } from 'vitest'

import { AddToCounterSchema, CounterParamsSchema, UpdateCourseDetailsSchema } from './schema'

const profileId = '11111111-1111-4111-8111-111111111111'

describe('UpdateCourseDetailsSchema', () => {
  it('takes a non-empty patch of scalars', () => {
    expect(
      UpdateCourseDetailsSchema.safeParse({ details: { japam: 5, note: 'x', done: true } }).success,
    ).toBe(true)
  })

  it('rejects an empty patch, a missing one, and anything nested or null', () => {
    for (const body of [
      { details: {} },
      {},
      { details: { japam: null } },
      { details: { japam: { n: 1 } } },
    ]) {
      expect(UpdateCourseDetailsSchema.safeParse(body).success, JSON.stringify(body)).toBe(false)
    }
  })
})

describe('AddToCounterSchema', () => {
  it('takes a whole number from 1 up to the per-request cap', () => {
    expect(AddToCounterSchema.safeParse({ count: 1 }).success).toBe(true)
    expect(AddToCounterSchema.safeParse({ count: 1_000_000 }).success).toBe(true)
  })

  it('rejects zero, negatives, fractions, anything above the cap, and non-numbers', () => {
    for (const count of [0, -1, 1.5, 1_000_001, '108', null, undefined]) {
      expect(AddToCounterSchema.safeParse({ count }).success, String(count)).toBe(false)
    }
  })
})

describe('CounterParamsSchema', () => {
  it('needs a profile id and a counter key', () => {
    expect(CounterParamsSchema.safeParse({ profileId, key: 'japam' }).success).toBe(true)
    expect(CounterParamsSchema.safeParse({ profileId, key: '' }).success).toBe(false)
    expect(CounterParamsSchema.safeParse({ profileId: 'nope', key: 'japam' }).success).toBe(false)
  })
})
