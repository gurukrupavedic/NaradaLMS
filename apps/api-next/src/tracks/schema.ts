import * as z from 'zod'

import { ChapterSchema } from '../chapters/schema'
import { proficiencyLevelSchema } from '../evaluations/schema'
import { isoInstant } from '../utils/validate'

export type Track = z.infer<typeof TrackSchema>
export const TrackSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  order: z.number().int(),
})

export type TrackWithChapters = z.infer<typeof TrackWithChaptersSchema>
export const TrackWithChaptersSchema = TrackSchema.extend({
  chapters: z.array(ChapterSchema),
})

// A track's certification result — decoupled from `chapter` (packages/db/src/schema/school.ts's
// `trackCertification` table has its own doc comment on why). Same append-only-history shape as
// `Evaluation`: multiple rows can exist for a student/track pair over time, latest wins; callers
// that need "the" current result reduce this list themselves, same as they already do for
// `studentEvaluations`.
export type TrackCertification = z.infer<typeof TrackCertificationSchema>
export const TrackCertificationSchema = z.object({
  id: z.uuid(),
  trackId: z.uuid(),
  studentId: z.uuid(),
  level: proficiencyLevelSchema,
  notes: z.string().nullable(),
  evaluatorId: z.uuid(),
  evaluatedAt: isoInstant.nullable(),
})
