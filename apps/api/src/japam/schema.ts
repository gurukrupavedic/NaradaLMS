import * as z from 'zod'

import { JAPAM_DAILY_MAX } from '@narada/db'

// Nothing about japam predates this; a date before it is a typo (0026-…), not history.
const EARLIEST = '2000-01-01'

/** A real calendar date, 'YYYY-MM-DD' — `z.iso.date()` rejects 2026-02-30. */
const calendarDate = z.iso.date().refine(date => date >= EARLIEST, `must be ${EARLIEST} or later`)

export const JapamParamsSchema = z.object({ profileId: z.uuid() })
export const JapamDayParamsSchema = JapamParamsSchema.extend({ loggedOn: calendarDate })

export type LogJapamData = z.infer<typeof LogJapamSchema>
export const LogJapamSchema = z.object({
  // How much to *add* to the day. Adding (rather than setting) is what makes two devices, or a
  // student and an admin, logging at once both count.
  count: z.number().int().min(1).max(JAPAM_DAILY_MAX),
  // Defaults to the student's today; a past day is how a forgotten sitting gets logged. Never a
  // future one — that is checked in the service, where the student's own "today" is known.
  loggedOn: calendarDate.optional(),
})

export type SetJapamDayData = z.infer<typeof SetJapamDaySchema>
export const SetJapamDaySchema = z.object({
  // What the day should now total. 0 clears it (a day with nothing logged has no row).
  count: z.number().int().min(0).max(JAPAM_DAILY_MAX),
})

export type FindJapamQuery = z.infer<typeof FindJapamSchema>
export const FindJapamSchema = z
  .object({
    // Inclusive bounds on the window `total` and `days` cover. Either, both or neither: no
    // window is a lifetime. Nothing here knows about "a year" — the caller picks the window.
    from: calendarDate.optional(),
    to: calendarDate.optional(),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: '`from` must not be after `to`',
  })

export type JapamDay = { loggedOn: string; count: number }

export type JapamSummary = {
  /** The student's own calendar date right now (their time zone), so a client never has to guess it. */
  today: string
  /** Japam in the requested window. */
  total: number
  /** Japam ever, whatever the window. */
  lifetime: number
  /** Every day in the window that has any, newest first. */
  days: JapamDay[]
}
