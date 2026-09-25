import * as z from 'zod'

import { COUNTER_DAILY_MAX } from '@narada/db'

// Nothing a counter tracks predates this; a date before it is a typo (0026-…), not history.
const EARLIEST = '2000-01-01'

/** A real calendar date, 'YYYY-MM-DD' — `z.iso.date()` rejects 2026-02-30. */
const calendarDate = z.iso.date().refine(date => date >= EARLIEST, `must be ${EARLIEST} or later`)

// Which counters exist is `@narada/profile-fields`' declaration for the request's school and course,
// checked in the service; here the key is only a well-formed string.
export const CounterParamsSchema = z.object({
  profileId: z.uuid(),
  key: z.string().min(1).max(64),
})
export const CounterDayParamsSchema = CounterParamsSchema.extend({ loggedOn: calendarDate })

export type LogCounterData = z.infer<typeof LogCounterSchema>
export const LogCounterSchema = z.object({
  // How much to *add* to the day. Adding (rather than setting) is what makes two devices, or a
  // student and an admin, logging at once both count.
  count: z.number().int().min(1).max(COUNTER_DAILY_MAX),
  // Defaults to the student's today; a past day is how a forgotten sitting gets logged. Never a
  // future one — that is checked in the service, where the student's own "today" is known.
  loggedOn: calendarDate.optional(),
})

export type SetCounterDayData = z.infer<typeof SetCounterDaySchema>
export const SetCounterDaySchema = z.object({
  // What the day should now total. 0 clears it (a day with nothing logged has no row).
  count: z.number().int().min(0).max(COUNTER_DAILY_MAX),
})

export type FindCounterQuery = z.infer<typeof FindCounterSchema>
export const FindCounterSchema = z
  .object({
    // Inclusive bounds on the window `total` and `days` cover. Either, both or neither: no
    // window is a lifetime. Nothing here knows about "a year" — the caller picks the window.
    from: calendarDate.optional(),
    to: calendarDate.optional(),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: '`from` must not be after `to`',
  })

export type CounterDay = { loggedOn: string; count: number }

export type CounterSummary = {
  /** The student's own calendar date right now (their time zone), so a client never has to guess it. */
  today: string
  /** The count in the requested window. */
  total: number
  /** The count ever, whatever the window. */
  lifetime: number
  /** Every day in the window that has any, newest first. */
  days: CounterDay[]
}
