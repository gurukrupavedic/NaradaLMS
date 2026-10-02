import * as z from 'zod'

import { ChapterSchema } from '../chapters/schema'

export type Track = z.infer<typeof TrackSchema>
export const TrackSchema = z.object({
  id: z.uuid(),
  courseId: z.uuid(),
  name: z.string(),
  order: z.number().int(),
})

export type ChapterContentState = z.infer<typeof ChapterContentStateSchema>
export const ChapterContentStateSchema = z.object({
  hasText: z.boolean(),
  segments: z.number().int(),
  audioCount: z.number().int(),
  mapped: z.boolean(),
})

// `ChapterSchema` itself stays thin (it's also what `chapters/schema.ts::ChapterDetailSchema`
// extends, and what the learner dashboard's own track list uses) — this richer shape is only for
// `GET /tracks`' authoring view, where `repository.ts::findAll` populates `content`.
export type TrackChapter = z.infer<typeof TrackChapterSchema>
export const TrackChapterSchema = ChapterSchema.extend({
  content: ChapterContentStateSchema.optional(),
})

export type TrackWithChapters = z.infer<typeof TrackWithChaptersSchema>
export const TrackWithChaptersSchema = TrackSchema.extend({
  chapters: z.array(TrackChapterSchema),
})

/** Full reorder of a track's active (non-archived) chapters — see `chapters/repository.ts::reorderChapters`'s own doc comment for how the new `order` values are assigned. */
export type ReorderChaptersData = z.infer<typeof ReorderChaptersSchema>
export const ReorderChaptersSchema = z.object({
  chapterIds: z.array(z.uuid()).min(1),
})
