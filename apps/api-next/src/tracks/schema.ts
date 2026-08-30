import * as z from 'zod'

import { ChapterSchema } from '../chapters/schema'

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
