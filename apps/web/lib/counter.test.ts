import { describe, expect, it } from 'vitest'

import { formatCount, parseCount } from './counter'

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
