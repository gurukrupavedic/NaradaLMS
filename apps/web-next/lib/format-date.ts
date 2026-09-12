import { format } from 'date-fns'

/**
 * The two date shapes this app actually shows a reader: a bare date (a chapter's evaluation, a
 * certification's award — the time of day was never meaningful) and a date with a time (a class
 * or exam sitting, where "when" means the clock too). Everywhere either shows up should go through
 * these, or `components/timestamp.tsx`'s `<Timestamp>`, rather than formatting a date inline —
 * that's what let `nextClass`'s scheduled time and an exam's `scheduledAt` drift into two
 * different formats (one hand-rolled `toLocaleString`, one not formatted at all).
 */

export function formatDate(iso: string | null | undefined): string {
  return iso ? format(new Date(iso), 'MMM d, yyyy') : ''
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? format(new Date(iso), 'EEE, MMM d, h:mm a') : ''
}
