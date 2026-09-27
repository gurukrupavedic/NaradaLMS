import * as z from 'zod'

import { chapterStatus, script } from '@narada/db'

export const chapterStatusSchema = z.enum(chapterStatus.enumValues)
export const chapterScriptSchema = z.enum(script.enumValues)

export type Chapter = z.infer<typeof ChapterSchema>
export const ChapterSchema = z.object({
  id: z.uuid(),
  trackId: z.uuid(),
  code: z.string(),
  title: z.string(),
  status: chapterStatusSchema,
  order: z.number().int(),
  script: chapterScriptSchema.nullable(),
})

export type ScriptSegment = z.infer<typeof scriptSegmentSchema>
export const scriptSegmentSchema = z.object({
  id: z.uuid(),
  start: z.number().int(),
  end: z.number().int(),
})

// One parallel script of a chapter's recitation — segments share ids with the chapter's other
// scripts (see `packages/db/src/schema/school.ts`'s `segment` table doc comment), each carrying
// this script's own offsets into this script's own `text`.
export type ScriptText = z.infer<typeof scriptTextSchema>
export const scriptTextSchema = z.object({
  key: chapterScriptSchema,
  label: z.string(),
  short: z.string(),
  fontClass: z.string(),
  text: z.string(),
  segments: z.array(scriptSegmentSchema),
})

export type AudioMapping = z.infer<typeof audioMappingSchema>
export const audioMappingSchema = z.object({
  segmentId: z.uuid(),
  audioStart: z.number(),
  audioEnd: z.number(),
})

export type AudioAsset = z.infer<typeof audioAssetSchema>
export const audioAssetSchema = z.object({
  id: z.uuid(),
  label: z.string().nullable(),
  reciter: z.string(),
  duration: z.number(),
  // Signed R2 download URL — the underlying object key never leaves the server.
  url: z.string(),
  mappings: z.array(audioMappingSchema),
})

export type ChapterDetail = z.infer<typeof ChapterDetailSchema>
export const ChapterDetailSchema = ChapterSchema.extend({
  scripts: z.array(scriptTextSchema),
  audio: z.array(audioAssetSchema),
})

// ── Chapter catalog management (title/order/status/delete) ─────────────────

export type CreateChapterData = z.infer<typeof CreateChapterSchema>
export const CreateChapterSchema = z.object({
  trackId: z.uuid(),
  code: z.string().min(1),
  title: z.string().min(1),
})

/**
 * `archived` is a real column, distinct from `status` — see `packages/db/src/schema/school.ts`'s
 * `chapter.archived` doc comment for why a chapter can't just be hard-deleted. The admin's
 * "Remove chapter" action sends `{ status: 'draft', archived: true }` through this same schema
 * rather than a separate delete endpoint.
 */
export type UpdateChapterData = z.infer<typeof UpdateChapterSchema>
export const UpdateChapterSchema = z
  .object({
    code: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    script: chapterScriptSchema.nullable().optional(),
    status: chapterStatusSchema.optional(),
    archived: z.boolean().optional(),
  })
  .refine(d => Object.keys(d).length > 0, { message: 'at least one field is required' })
