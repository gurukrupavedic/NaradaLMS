import { describe, expect, it } from 'vitest'

import { PHONE_COUNTRIES, PHONE_REGEX, guessPhoneCountry } from './phone-countries'

describe('PHONE_COUNTRIES', () => {
  it('gives every country a plain-digit dial code (no "1-684" style area-code suffixes)', () => {
    expect(PHONE_COUNTRIES.length).toBeGreaterThan(200)
    for (const country of PHONE_COUNTRIES) {
      expect(country.dialCode).toMatch(/^\d+$/)
    }
  })

  it('composes into a number PHONE_REGEX accepts for territories that used to carry area-code dial codes', () => {
    const samoa = PHONE_COUNTRIES.find(country => country.isoCode === 'AS')!
    expect(`+${samoa.dialCode}6845551234`).toMatch(PHONE_REGEX)
  })
})

describe('guessPhoneCountry', () => {
  it('resolves a full number to its country', () => {
    expect(guessPhoneCountry('+919885981818')?.isoCode).toBe('IN')
  })

  it('tells a shared calling code apart by area code', () => {
    expect(guessPhoneCountry('+16845551234')?.isoCode).toBe('AS')
    expect(guessPhoneCountry('+12025550123')?.isoCode).toBe('US')
  })

  it('falls back to the longest calling code for a number still being typed', () => {
    expect(guessPhoneCountry('+91')?.isoCode).toBe('IN')
    expect(guessPhoneCountry('+1')?.isoCode).toBe('US')
  })

  it('has no guess for an empty value', () => {
    expect(guessPhoneCountry('')).toBeUndefined()
  })
})
