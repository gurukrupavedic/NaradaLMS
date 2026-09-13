/**
 * A short, human "browser on device" summary from a raw User-Agent string — used on the
 * device-link approval confirmation (`components/approve-device-form.tsx`) and the linked-devices
 * list (`app/settings/page.tsx`), the two places this app shows a UA string to a reader rather
 * than just logging it. Deliberately not a real parser (no dependency for something this
 * cosmetic): covers the common cases, falls back to the raw string when nothing matches rather
 * than guessing wrong.
 */
export function summarizeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device'

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /CriOS\//.test(userAgent) || /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : null

  const device = /iPhone/.test(userAgent)
    ? 'iPhone'
    : /iPad/.test(userAgent)
      ? 'iPad'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Macintosh/.test(userAgent)
          ? 'Mac'
          : /Windows/.test(userAgent)
            ? 'Windows'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : null

  if (browser && device) return `${browser} on ${device}`
  if (browser) return browser
  if (device) return device
  return userAgent
}
