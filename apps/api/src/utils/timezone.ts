import { City, Country, State } from 'country-state-city'
import { find as findTimeZonesAt } from 'geo-tz'

/**
 * Server-side derivation for `profile`/`registration`'s `countryTimeZone` column — never
 * client-supplied directly (see those tables' own doc comments in
 * `packages/db/src/schema/school.ts`). Resolves the most precise coordinates available and runs
 * them through `geo-tz` (an offline, coordinate-to-IANA-zone lookup), rather than a hand-maintained
 * country/state-to-timezone table: that would need a bespoke entry for every one of the ~250
 * countries and thousands of states `country-state-city` already covers, and would still get
 * multi-zone countries like the US wrong at the state level (e.g. Arizona doesn't observe DST,
 * so it can't share Nevada's zone even though both are "Mountain time").
 *
 * Precision falls back in three steps: a named city's own coordinates (most precise), then its
 * state's centroid, then the country's first-listed zone (exact for a single-zone country, a
 * best-effort default otherwise). Returns null if `country` is missing or unrecognized.
 */
export function deriveTimeZone(input: {
  country: string | null | undefined
  state: string | null | undefined
  city: string | null | undefined
}): string | null {
  const countryCode = input.country?.trim()
  if (!countryCode) return null

  const countryInfo = Country.getCountryByCode(countryCode)
  if (!countryInfo) return null

  const stateCode = input.state?.trim()
  const stateInfo = stateCode ? State.getStateByCodeAndCountry(stateCode, countryCode) : undefined

  const coordinates = resolveCoordinates(countryCode, stateCode, stateInfo, input.city)
  if (coordinates) {
    const [zone] = findTimeZonesAt(coordinates.latitude, coordinates.longitude)
    if (zone) return zone
  }

  return countryInfo.timezones?.[0]?.zoneName ?? null
}

function resolveCoordinates(
  countryCode: string,
  stateCode: string | undefined,
  stateInfo: ReturnType<typeof State.getStateByCodeAndCountry>,
  city: string | null | undefined,
): { latitude: number; longitude: number } | undefined {
  const cityName = city?.trim().toLowerCase()
  if (stateCode && cityName) {
    const match = City.getCitiesOfState(countryCode, stateCode).find(
      candidate => candidate.name.toLowerCase() === cityName,
    )
    if (match?.latitude && match?.longitude) {
      return { latitude: Number(match.latitude), longitude: Number(match.longitude) }
    }
  }

  if (stateInfo?.latitude && stateInfo?.longitude) {
    return { latitude: Number(stateInfo.latitude), longitude: Number(stateInfo.longitude) }
  }

  return undefined
}
