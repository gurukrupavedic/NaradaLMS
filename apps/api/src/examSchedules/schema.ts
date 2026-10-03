import * as z from 'zod'

import { isoInstant } from '../utils/validate'

function isIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export type ExamSchedule = z.infer<typeof ExamScheduleSchema>
export const ExamScheduleSchema = z.object({
  id: z.uuid(),
  courseId: z.uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  // `time` columns come back as 'HH:MM:SS'.
  startTime: z.string(),
  timeZone: z.string(),
  slotCount: z.number().int().min(1).max(24),
  slotMinutes: z.number().int().min(5).max(480),
  createdBy: z.uuid(),
  createdAt: isoInstant,
})

// A rule is replaced whole on update (there is no partial patch): the generated slots are rebuilt
// from it, so a half-specified rule would have no meaning.
export type ExamScheduleData = z.infer<typeof ExamScheduleDataSchema>
export const ExamScheduleDataSchema = z.object({
  dayOfWeek: ExamScheduleSchema.shape.dayOfWeek,
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be HH:MM'),
  timeZone: z.string().refine(isIanaTimeZone, 'timeZone must be an IANA time zone identifier'),
  slotCount: ExamScheduleSchema.shape.slotCount,
  slotMinutes: ExamScheduleSchema.shape.slotMinutes,
})

/** What an update reports back: future requested/booked slots from this schedule that the new rule
 * no longer produces. They keep their old time (a student is already committed to them). */
export type UpdateExamScheduleResult = { schedule: ExamSchedule; keptSlots: number }
