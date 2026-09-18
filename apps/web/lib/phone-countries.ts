import { PHONE_COUNTRIES_DATA } from './phone-countries-data'

/**
 * Dial codes and flags for `PhoneInput`'s country picker — deliberately its own module, separate
 * from `geo.ts`'s `country-state-city`-backed address pickers. That package's ESM entry exports
 * `Country`, `State`, and `City` from one barrel file, so importing `Country` for a dial code
 * pulls in `State`'s ~550KB dataset too (bundlers can't prove it's unused when the barrel
 * computes `COUNTRY_OPTIONS` eagerly at module scope). `phone-countries-data.ts` is a plain
 * generated literal instead, so a page that only needs `PhoneInput` (e.g. `/login`) doesn't pay
 * for the address form's state dataset it never renders. Regenerate the data file with:
 *
 *   node -e "const {Country}=require('country-state-city');console.log(JSON.stringify(
 *     Country.getAllCountries().filter(c=>c.phonecode).map(c=>({isoCode:c.isoCode,name:c.name,
 *     dialCode:c.phonecode.replace(/^\+/,''),flag:c.flag}))))"
 */
export type PhoneCountry = { isoCode: string; name: string; dialCode: string; flag: string }

export const PHONE_COUNTRIES: PhoneCountry[] = PHONE_COUNTRIES_DATA

export const DEFAULT_PHONE_COUNTRY: PhoneCountry =
  PHONE_COUNTRIES.find(country => country.isoCode === 'IN') ?? PHONE_COUNTRIES[0]

// Longest dial code that prefixes `digits` wins — `1` (US/Canada) is a prefix of some
// three-digit Caribbean codes, so shortest-first would misattribute those numbers.
export function guessPhoneCountry(value: string): PhoneCountry | undefined {
  const digits = value.replace(/^\+/, '')
  if (!digits) return undefined
  return [...PHONE_COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find(country => digits.startsWith(country.dialCode))
}
