/**
 * The calendar date ('YYYY-MM-DD') it is right now in `timeZone` — the student's own "today", which
 * is what a day's japam is filed under (`japamLog.loggedOn`). Falls back to UTC for a profile with no
 * time zone on record (no country given), and for one whose stored zone the runtime doesn't know:
 * a wrong-by-hours day boundary is better than refusing to log at all.
 */
export function todayIn(timeZone: string | null | undefined, now: Date = new Date()): string {
  try {
    return formatDate(timeZone || 'UTC', now)
  } catch {
    return formatDate('UTC', now)
  }
}

// `en-CA` is the one common locale that formats a date as year-month-day.
function formatDate(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}
