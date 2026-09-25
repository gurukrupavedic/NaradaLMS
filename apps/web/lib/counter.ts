/**
 * Small pure helpers for `components/counter-card.tsx`, kept here so they are tested (see
 * `vitest.config.ts`: the components themselves aren't).
 */

/** 108000 → "108,000". A fixed locale, so a count reads the same wherever it is viewed. */
export function formatCount(count: number): string {
  return count.toLocaleString('en-US')
}

/**
 * A count typed into a box, as a number — `null` when it isn't a whole number ≥ 0. Digits only, so
 * "1e3", "12.5", "-4" and " " are all refused rather than guessed at. (Whether it is *too big* is the
 * server's rule, and its message is what the person sees.)
 */
export function parseCount(text: string): number | null {
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

/** '2026-03-02' → "2 Mar 2026". Formats the date's own parts, never through a `Date`, so no time
 * zone can shift it by a day. */
export function formatDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`
}
