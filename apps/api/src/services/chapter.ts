import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'

import { chapter, segment, audioAsset, audioMapping, type Database } from '@narada/db'
import { getDownloadUrl } from '@narada/storage'
import { internalError, notFound } from '../error'

export const chapterSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  code: z.string(),
  title: z.string(),
  status: z.enum(['draft', 'published']),
  order: z.number(),
  script: z.enum(['te', 'sa', 'en']).nullable(),
  textUrl: z.string().nullable(),
})

export const segmentSchema = z.object({
  id: z.string(),
  chapterId: z.string(),
  start: z.number(),
  end: z.number(),
})

export const audioMappingSchema = z.object({
  segmentId: z.string(),
  audioAssetId: z.string(),
  audioStart: z.number(),
  audioEnd: z.number(),
})

export const audioAssetSchema = z.object({
  id: z.string(),
  chapterId: z.string(),
  label: z.string().nullable(),
  url: z.string(),
  duration: z.number(),
  audioMappings: z.array(audioMappingSchema),
})

export const chapterDetailSchema = chapterSchema.extend({
  segments: z.array(segmentSchema),
  audioAssets: z.array(audioAssetSchema),
})

export const createChapterSchema = z.object({
  trackId: z.uuid(),
  title: z.string().min(1),
  code: z.string().min(1),
})

export const updateChapterSchema = z
  .object({
    title: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    status: z.enum(['draft', 'published']).optional(),
    order: z.number().int().positive().optional(),
    trackId: z.uuid().optional(),
    script: z.enum(['te', 'sa', 'en']).optional(),
    textUrl: z.string().optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'No fields to update' })

export type Chapter = z.infer<typeof chapterSchema>
export type Segment = z.infer<typeof segmentSchema>
export type AudioMapping = z.infer<typeof audioMappingSchema>
export type AudioAsset = z.infer<typeof audioAssetSchema>
export type ChapterDetail = z.infer<typeof chapterDetailSchema>
export type CreateChapterData = z.infer<typeof createChapterSchema>
export type UpdateChapterData = z.infer<typeof updateChapterSchema>

type DbChapter = typeof chapter.$inferSelect
type DbSegment = typeof segment.$inferSelect
type DbAudioAsset = typeof audioAsset.$inferSelect
type DbAudioMapping = typeof audioMapping.$inferSelect

function mapChapter(row: DbChapter): Chapter {
  return {
    id: row.id,
    trackId: row.trackId,
    code: row.code,
    title: row.title,
    status: row.status,
    order: row.order,
    script: row.script,
    textUrl: row.textUrl,
  }
}

function mapSegment(row: DbSegment): Segment {
  return { id: row.id, chapterId: row.chapterId, start: row.start, end: row.end }
}

function mapAudioMapping(row: DbAudioMapping): AudioMapping {
  return {
    segmentId: row.segmentId,
    audioAssetId: row.audioAssetId,
    audioStart: row.audioStart,
    audioEnd: row.audioEnd,
  }
}

function mapAudioAsset(row: DbAudioAsset & { audioMappings: DbAudioMapping[] }): AudioAsset {
  return {
    id: row.id,
    chapterId: row.chapterId,
    label: row.label,
    url: row.url,
    duration: row.duration,
    audioMappings: row.audioMappings.map(mapAudioMapping),
  }
}

export default class ChapterService {
  public static async findById(
    db: Database,
    chapterId: string,
    includeDrafts: boolean,
  ): Promise<ChapterDetail | undefined> {
    const row = await db.query.chapter.findFirst({
      where: (t, { eq }) => eq(t.id, chapterId),
      with: {
        segments: { orderBy: asc(segment.start) },
        audioAssets: { with: { audioMappings: true } },
      },
    })

    if (!row || (!includeDrafts && row.status === 'draft')) {
      return undefined
    }

    return {
      ...mapChapter(row),
      segments: row.segments.map(mapSegment),
      audioAssets: row.audioAssets.map(mapAudioAsset),
    }
  }

  public static async create(db: Database, data: CreateChapterData): Promise<Chapter> {
    const rows = await db.insert(chapter).values(data).returning()
    const row = rows.at(0)
    if (!row) {
      throw internalError()
    }

    return mapChapter(row)
  }

  public static async update(
    db: Database,
    chapterId: string,
    data: UpdateChapterData,
  ): Promise<Chapter> {
    const rows = await db.update(chapter).set(data).where(eq(chapter.id, chapterId)).returning()
    const row = rows.at(0)
    if (!row) {
      throw internalError()
    }

    return mapChapter(row)
  }

  public static async applyScript(
    db: Database,
    chapterId: string,
    scriptType: 'te' | 'sa' | 'en',
    objectKey: string,
  ): Promise<Chapter> {
    const existing = await db.query.chapter.findFirst({
      where: (t, { eq }) => eq(t.id, chapterId),
    })

    if (!existing) {
      throw notFound()
    }

    const textUrl = await getDownloadUrl(objectKey)
    return await db.transaction(async tx => {
      await tx.delete(segment).where(eq(segment.chapterId, chapterId))
      const rows = await tx
        .update(chapter)
        .set({ script: scriptType, textUrl })
        .where(eq(chapter.id, chapterId))
        .returning()

      const row = rows.at(0)
      if (!row) {
        throw internalError()
      }

      return mapChapter(row)
    })
  }
}
