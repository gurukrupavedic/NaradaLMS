import { describe, expect, it } from 'vitest'

import { deriveTimeZone } from './timezone'

describe('deriveTimeZone', () => {
  it('resolves a named city to its exact zone (Massachusetts, US)', () => {
    expect(deriveTimeZone({ country: 'US', state: 'MA', city: 'Cambridge' })).toBe(
      'America/New_York',
    )
  })

  it('resolves a named city to its exact zone (Telangana, India)', () => {
    expect(deriveTimeZone({ country: 'IN', state: 'TG', city: 'Hyderabad' })).toBe('Asia/Kolkata')
  })

  it('is case-insensitive when matching the city name', () => {
    expect(deriveTimeZone({ country: 'US', state: 'MA', city: 'CAMBRIDGE' })).toBe(
      'America/New_York',
    )
  })

  it('falls back to the state centroid when the city has no match', () => {
    expect(deriveTimeZone({ country: 'US', state: 'MA', city: 'Nowhereville' })).toBe(
      'America/New_York',
    )
  })

  it('falls back to the state centroid when no city is given at all', () => {
    expect(deriveTimeZone({ country: 'IN', state: 'TG', city: null })).toBe('Asia/Kolkata')
  })

  it("falls back to the country's first-listed zone when no state is given", () => {
    // India has a single zone, so the country-level fallback is exact here too.
    expect(deriveTimeZone({ country: 'IN', state: null, city: null })).toBe('Asia/Kolkata')
  })

  it('returns a best-effort default for a multi-zone country with no state/city precision', () => {
    const us = deriveTimeZone({ country: 'US', state: null, city: null })
    expect(typeof us).toBe('string')
  })

  it('returns null for a missing country', () => {
    expect(deriveTimeZone({ country: null, state: 'MA', city: 'Cambridge' })).toBeNull()
  })

  it('returns null for an unrecognized country code', () => {
    expect(deriveTimeZone({ country: 'ZZ', state: null, city: null })).toBeNull()
  })

  it('ignores an unrecognized state code and falls back to the country default', () => {
    expect(deriveTimeZone({ country: 'IN', state: 'ZZ', city: 'Hyderabad' })).toBe('Asia/Kolkata')
  })
})
