import { formatDate, formatDateTime } from '@/lib/format-date'

/**
 * A single date or date-time, formatted consistently everywhere one shows up — a chapter's
 * evaluation, a certification's award, a class or exam's scheduled time. Renders a semantic
 * `<time>` (real `dateTime` attribute, so the raw ISO value is still there for anything reading
 * the DOM) and nothing at all for a missing value, so callers can drop it inline without their own
 * null check.
 */
export function Timestamp({
  value,
  variant = 'date',
  className,
}: {
  value: string | null | undefined
  variant?: 'date' | 'dateTime'
  className?: string
}) {
  if (!value) return null

  return (
    <time dateTime={value} className={className}>
      {variant === 'dateTime' ? formatDateTime(value) : formatDate(value)}
    </time>
  )
}
