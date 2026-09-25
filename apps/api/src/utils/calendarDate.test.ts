import { describe, expect, it } from 'vitest'

import { todayIn } from './calendarDate'

// 2026-03-01 20:00 UTC: already the 2nd in Kolkata (UTC+5:30), still the 1st in New York (UTC-5).
const instant = new Date('2026-03-01T20:00:00Z')

describe('todayIn', () => {
  it("is the date in the student's own time zone, not the server's", () => {
    expect(todayIn('Asia/Kolkata', instant)).toBe('2026-03-02')
    expect(todayIn('America/New_York', instant)).toBe('2026-03-01')
    expect(todayIn('UTC', instant)).toBe('2026-03-01')
  })

  it('pads month and day', () => {
    expect(todayIn('UTC', new Date('2026-01-05T00:00:00Z'))).toBe('2026-01-05')
  })

  it('falls back to UTC for no zone, or one the runtime does not know', () => {
    expect(todayIn(null, instant)).toBe('2026-03-01')
    expect(todayIn('', instant)).toBe('2026-03-01')
    expect(todayIn('Not/AZone', instant)).toBe('2026-03-01')
  })
})
