import { Country, State } from 'country-state-city'

/**
 * Country/state pickers for the registration form and the profile self-edit dialog, backed by
 * `country-state-city`'s offline dataset (~250 countries) rather than a hand-typed list — the
 * same package `apps/api/src/utils/timezone.ts` uses server-side to derive `countryTimeZone`, so
 * the codes a caller picks here are exactly what that derivation understands. Values are ISO
 * codes (not display names) for the same reason the API stores them that way: a stable identifier
 * that survives a display-name rename, not a string that has to match exactly on the way back.
 */

export const COUNTRY_OPTIONS: { value: string; label: string }[] = Country.getAllCountries()
  .map(country => ({ value: country.isoCode, label: country.name }))
  .sort((a, b) => a.label.localeCompare(b.label))

// Empty for a country with no formal subdivisions in the dataset — callers render no state
// picker at all in that case rather than a picker with nothing in it.
export function getStateOptions(countryCode: string): { value: string; label: string }[] {
  if (!countryCode) return []
  return State.getStatesOfCountry(countryCode)
    .map(state => ({ value: state.isoCode, label: state.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** "State, Country" from stored ISO codes, for display — null if there's no country on record. */
export function formatLocation(state: string | null, country: string | null): string | null {
  if (!country) return null
  const countryName = Country.getCountryByCode(country)?.name ?? country
  if (!state) return countryName
  const stateName = State.getStateByCodeAndCountry(state, country)?.name ?? state
  return `${stateName}, ${countryName}`
}
