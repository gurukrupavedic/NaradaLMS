import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min'

/** E.164, the shape apps/api validates every phone number against (`utils/validate.ts::e164Phone`). */
export const PHONE_REGEX = /^\+[1-9]\d{7,14}$/

export type PhoneCountry = { isoCode: CountryCode; name: string; dialCode: string; flag: string }

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

// A flag emoji is just the two regional-indicator letters for the ISO code.
function flagEmoji(isoCode: string): string {
  return String.fromCodePoint(...[...isoCode].map(letter => 0x1f1a5 + letter.charCodeAt(0)))
}

/** Every region libphonenumber knows a calling code for, by name. Several regions can share one dial code (`+1`). */
export const PHONE_COUNTRIES: PhoneCountry[] = getCountries()
  .map(isoCode => ({
    isoCode,
    name: regionNames.of(isoCode) ?? isoCode,
    dialCode: getCountryCallingCode(isoCode),
    flag: flagEmoji(isoCode),
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

export const DEFAULT_PHONE_COUNTRY: PhoneCountry =
  PHONE_COUNTRIES.find(country => country.isoCode === 'IN') ?? PHONE_COUNTRIES[0]

/**
 * The country a full `+<digits>` number belongs to. libphonenumber resolves shared calling codes
 * (`+1684…` is American Samoa, not the US); a number too short to parse falls back to the longest
 * calling code that prefixes it (the US for the shared `+1`).
 */
export function guessPhoneCountry(value: string): PhoneCountry | undefined {
  const digits = value.replace(/^\+/, '')
  if (!digits) return undefined

  const parsedCountry = parsePhoneNumberFromString(`+${digits}`)?.country
  if (parsedCountry) return PHONE_COUNTRIES.find(country => country.isoCode === parsedCountry)

  const matches = PHONE_COUNTRIES.filter(country => digits.startsWith(country.dialCode))
  const longest = Math.max(0, ...matches.map(country => country.dialCode.length))
  const candidates = matches.filter(country => country.dialCode.length === longest)
  return candidates.find(country => country.isoCode === 'US') ?? candidates[0]
}
