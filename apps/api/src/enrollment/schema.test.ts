import { describe, expect, it } from 'vitest'

import { SetEnrollmentScoresSchema } from './schema'

describe('SetEnrollmentScoresSchema', () => {
  it('accepts any subset of the three scores, each -1, 0, 1 or null', () => {
    expect(SetEnrollmentScoresSchema.safeParse({ attendanceScore: -1 }).success).toBe(true)
    expect(SetEnrollmentScoresSchema.safeParse({ recitationScore: null, backlogScore: 0 }).success).toBe(true)
  })

  it('rejects an empty body, an out-of-range value and an unknown key', () => {
    expect(SetEnrollmentScoresSchema.safeParse({}).success).toBe(false)
    expect(SetEnrollmentScoresSchema.safeParse({ attendanceScore: 2 }).success).toBe(false)
    expect(SetEnrollmentScoresSchema.safeParse({ attendanceScore: 0.5 }).success).toBe(false)
    expect(SetEnrollmentScoresSchema.safeParse({ attendanceScore: 1, role: 'x' }).success).toBe(false)
  })
})
