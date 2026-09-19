import * as z from 'zod'

import { ChapterSchema } from '../chapters/schema'

export type Track = z.infer<typeof TrackSchema>
export const TrackSchema = z.object({
  id: z.uuid(),
  courseId: z.uuid(),
  name: z.string(),
  order: z.number().int(),
})

export type TrackWithChapters = z.infer<typeof TrackWithChaptersSchema>
export const TrackWithChaptersSchema = TrackSchema.extend({
  chapters: z.array(ChapterSchema),
})

/** Full reorder of a track's active (non-archived) chapters — see `chapters/repository.ts::reorderChapters`'s own doc comment for how the new `order` values are assigned. */
export type ReorderChaptersData = z.infer<typeof ReorderChaptersSchema>
export const ReorderChaptersSchema = z.object({
  chapterIds: z.array(z.uuid()).min(1),
})
