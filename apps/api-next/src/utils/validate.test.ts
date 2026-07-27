import { describe, expect, it } from 'vitest'

import { httpsUrl, isoInstant } from './validate'

describe('isoInstant', () => {
  it.each([
    ['null', null],
    ['a number', 1704067200000],
    ['a boolean', true],
    ['an empty string', ''],
    ['an impossible calendar date', '2024-13-40T00:00:00Z'],
    ['an offset-free timestamp', '2024-01-01T00:00:00'],
    ['a date-only string', '2024-01-01'],
  ])('rejects %s', (_label, value) => {
    expect(isoInstant.safeParse(value).success).toBe(false)
  })

  it.each([
    ['a Z-suffixed instant', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00.000Z'],
    ['a positive-offset instant', '2024-01-01T00:00:00+05:30', '2023-12-31T18:30:00.000Z'],
    ['a negative-offset instant', '2024-01-01T00:00:00-08:00', '2024-01-01T08:00:00.000Z'],
  ])('accepts %s and round-trips the instant', (_label, input, expectedIso) => {
    const result = isoInstant.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeInstanceOf(Date)
      expect(result.data.toISOString()).toBe(expectedIso)
    }
  })
})

describe('httpsUrl', () => {
  it.each([
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:text/html,x'],
    ['a mailto: URL', 'mailto:a@b.com'],
    ['a file: URL', 'file:///etc/passwd'],
    ['an ftp: URL', 'ftp://host/x'],
    ['a protocol-relative URL', '//host/path'],
    ['a plain http: URL', 'http://host'],
    ['a URL with a username and password', 'https://user:pass@host'],
    ['a URL with only a username', 'https://user@host/x'],
    ['a non-string', 123],
  ])('rejects %s', (_label, value) => {
    expect(httpsUrl.safeParse(value).success).toBe(false)
  })

  it('rejects a protocol-relative URL without throwing', () => {
    expect(() => httpsUrl.safeParse('//host/path')).not.toThrow()
    expect(httpsUrl.safeParse('//host/path').success).toBe(false)
  })

  it.each(['https://zoom.us/j/123', 'https://meet.google.com/abc-defg-hij'])(
    'accepts an ordinary HTTPS URL: %s',
    value => {
      const result = httpsUrl.safeParse(value)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(value)
      }
    },
  )
})
