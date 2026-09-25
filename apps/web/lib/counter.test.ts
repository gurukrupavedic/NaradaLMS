import { describe, expect, it } from 'vitest'

import { formatCount, formatDay, parseCount } from './counter'

describe('formatCount', () => {
  it('groups thousands, the same everywhere', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(108)).toBe('108')
    expect(formatCount(108000)).toBe('108,000')
  })
})

describe('parseCount', () => {
  it('reads a whole number, surrounding spaces ignored', () => {
    expect(parseCount('108')).toBe(108)
    expect(parseCount('  54 ')).toBe(54)
    expect(parseCount('0')).toBe(0)
  })

  it('refuses everything else instead of guessing', () => {
    for (const text of ['', ' ', '12.5', '-4', '1e3', '1,000', 'abc', '10 8']) {
      expect(parseCount(text), text).toBeNull()
    }
  })
})

describe('formatDay', () => {
  it('names the day without a time zone able to move it', () => {
    expect(formatDay('2026-03-02')).toBe('2 Mar 2026')
    expect(formatDay('2026-12-31')).toBe('31 Dec 2026')
    expect(formatDay('2026-01-01')).toBe('1 Jan 2026')
  })
})
