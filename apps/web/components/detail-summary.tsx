import { Fragment } from 'react'
import { visibleFields, type Details, type FieldDefinition } from '@narada/profile-fields'

import { displayDetail } from '@/lib/profile-details'
import { cn } from '@/lib/utils'

/**
 * The school-specific answers (`@narada/profile-fields`) as the read-only `dl` the profile and
 * registration screens use for everything else, so it looks like the sections around it. Two
 * columns once there are enough fields to fill them, one until then. An unanswered field shows a
 * dash — a teacher should see what's missing — but one the answers hide (a wife's gothram for
 * someone unmarried) isn't shown at all.
 */
export function DetailSummary({
  fields,
  details,
}: {
  fields: readonly FieldDefinition[]
  details: Details
}) {
  const shown = visibleFields(fields, details)
  const columns =
    shown.length > 2
      ? [shown.filter((_, i) => i % 2 === 0), shown.filter((_, i) => i % 2 === 1)]
      : [shown]

  return (
    <dl
      className={cn(
        'sheet grid grid-cols-1 divide-y divide-rule-soft',
        columns.length > 1 && 'sm:grid-cols-2 sm:divide-x sm:divide-y-0',
      )}
    >
      {columns.map((column, i) => (
        <div key={i} className="px-4 py-4">
          {column.map((field, j) => (
            <Fragment key={field.key}>
              <dt className={cn('label text-ink-muted', j > 0 && 'mt-5')}>{field.label}</dt>
              <dd className="mt-2 text-[0.9375rem]">{displayDetail(field, details) ?? '—'}</dd>
            </Fragment>
          ))}
        </div>
      ))}
    </dl>
  )
}
