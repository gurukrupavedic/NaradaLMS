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

// ── Content authoring (write side) ──────────────────────────────────────────

export type ScriptSegmentInput = z.infer<typeof scriptSegmentInputSchema>
export const scriptSegmentInputSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  })
  .refine(d => d.end > d.start, { message: 'end must be greater than start' })

export type UpsertScriptData = z.infer<typeof UpsertScriptSchema>
export const UpsertScriptSchema = z.object({
  label: z.string().min(1),
  short: z.string().min(1),
  fontClass: z.string().min(1),
  text: z.string().min(1),
  segments: z
    .array(scriptSegmentInputSchema)
    .min(1)
    .refine(segs => segs.every((s, i) => i === 0 || s.start >= segs[i - 1]!.end), {
      message: 'segments must be in order and non-overlapping',
    }),
})

const audioContentTypeSchema = z.enum(['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/mp4'])

export type CreateAudioUploadData = z.infer<typeof CreateAudioUploadSchema>
export const CreateAudioUploadSchema = z.object({
  contentType: audioContentTypeSchema,
})

export type CreateAudioAssetData = z.infer<typeof CreateAudioAssetSchema>
export const CreateAudioAssetSchema = z.object({
  uploadId: z.uuid(),
  label: z.string().min(1).nullable().default(null),
  reciter: z.string().min(1),
  // No client-reported `duration` — the server derives it from the uploaded bytes themselves
  // (`utils/audioMetadata.ts`), so a client-supplied number would just be dead input never used
  // for anything.
})

const audioMappingInputSchema = z
  .object({
    segmentId: z.uuid(),
    audioStart: z.number().nonnegative(),
    audioEnd: z.number().positive(),
  })
  .refine(d => d.audioEnd > d.audioStart, { message: 'audioEnd must be greater than audioStart' })

export type SetAudioMappingsData = z.infer<typeof SetAudioMappingsSchema>
export const SetAudioMappingsSchema = z.object({
  mappings: z.array(audioMappingInputSchema).refine(
    ms => {
      const sorted = [...ms].sort((a, b) => a.audioStart - b.audioStart)
      return sorted.every((m, i) => i === 0 || m.audioStart >= sorted[i - 1]!.audioEnd)
    },
    { message: 'mappings must not overlap' },
  ),
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

/**
 * Resizing a chapter's shared segment timeline — every script must be resegmented together (a
 * single script's save can't safely do this alone, see `upsertScript`'s own doc comment), so this
 * takes new segments for every script at once rather than one at a time. Every script must submit
 * the same segment count; which exact script *keys* must be present is checked in the service
 * (against what the chapter actually has), not here — this schema only validates shape.
 */
export type ResegmentData = z.infer<typeof ResegmentSchema>
export const ResegmentSchema = z
  .object({
    // `z.record` with an enum key requires every enum value present — wrong here, since a chapter
    // may not have all three scripts authored yet. `partialRecord` allows any subset of script
    // keys; the service checks the submitted keys are exactly the chapter's *existing* ones.
    scripts: z.partialRecord(chapterScriptSchema, z.object({ segments: z.array(scriptSegmentInputSchema).min(1) })),
  })
  .refine(
    data => {
      const counts = Object.values(data.scripts).map(s => s.segments.length)
      return counts.length > 0 && counts.every(c => c === counts[0])
    },
    { message: 'every script must be resegmented with the same number of segments' },
  )
