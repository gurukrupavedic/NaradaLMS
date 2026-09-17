/**
 * Formats an IANA zone id (e.g. 'America/New_York', server-derived — see
 * `apps/api/src/utils/timezone.ts`) for display. Computed at render time rather than stored
 * pre-formatted, so it's always correct for the current DST state instead of going stale for a
 * zone that observes it. Prefers a real abbreviation (EDT, PDT) when `Intl` has one; falls back to
 * a plain UTC offset for zones where it doesn't (e.g. India, most of the UK) rather than showing
 * "GMT+5:30" twice over.
 */
export function formatTimeZone(ianaId: string | null, at: Date = new Date()): string | null {
  if (!ianaId) return null

  try {
    const short = new Intl.DateTimeFormat('en-US', { timeZone: ianaId, timeZoneName: 'short' })
      .formatToParts(at)
      .find(part => part.type === 'timeZoneName')?.value

    const offset = new Intl.DateTimeFormat('en-US', { timeZone: ianaId, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find(part => part.type === 'timeZoneName')?.value

    const label = ianaId.replace(/_/g, ' ')
    if (short && !short.startsWith('GMT')) {
      return `${label} (${short}, ${offset})`
    }
    return offset ? `${label} (${offset})` : label
  } catch {
    // An unrecognized/invalid zone id shouldn't crash the page it's rendered on.
    return ianaId
  }
}
