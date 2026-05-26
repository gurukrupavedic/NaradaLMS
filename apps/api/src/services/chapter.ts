import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'

import { chapter, segment, audioAsset, audioMapping, type Database } from '@narada/db'
import { getDownloadUrl } from '@narada/storage'
import { forbidden, internalError, notFound } from '../error'
import { resolveDownloadUrl } from '../utils/storage'

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
    textObjectKey: z.string().optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'No fields to update' })

export type Chapter = Omit<typeof chapter.$inferSelect, 'textObjectKey'> & { textUrl: string | null }
export type Segment = typeof segment.$inferSelect
export type AudioMapping = typeof audioMapping.$inferSelect
export type AudioAsset = Omit<typeof audioAsset.$inferSelect, 'objectKey'> & {
  url: string
  audioMappings: AudioMapping[]
}

export type ChapterDetail = Chapter & {
  segments: Segment[]
  audioAssets: AudioAsset[]
}

export type CreateChapterData = z.infer<typeof createChapterSchema>
export type UpdateChapterData = z.infer<typeof updateChapterSchema>

type DbChapter = typeof chapter.$inferSelect
type DbAudioAsset = typeof audioAsset.$inferSelect
type DbAudioMapping = typeof audioMapping.$inferSelect

async function chapterResponse(row: DbChapter): Promise<Chapter> {
  return {
    id: row.id,
    trackId: row.trackId,
    code: row.code,
    title: row.title,
    status: row.status,
    order: row.order,
    script: row.script,
    textUrl: row.textObjectKey ? await resolveDownloadUrl(row.textObjectKey) : null,
  }
}

async function audioAssetResponse(
  row: DbAudioAsset & { audioMappings: DbAudioMapping[] },
): Promise<AudioAsset> {
  return {
    id: row.id,
    chapterId: row.chapterId,
    label: row.label,
    url: await getDownloadUrl(row.objectKey),
    duration: row.duration,
    audioMappings: row.audioMappings,
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

    if (!row) return undefined
    if (!includeDrafts && row.status === 'draft') throw forbidden()

    return {
      ...(await chapterResponse(row)),
      segments: row.segments,
      audioAssets: await Promise.all(row.audioAssets.map(audioAssetResponse)),
    }
  }

  public static async create(db: Database, data: CreateChapterData): Promise<Chapter> {
    const rows = await db.insert(chapter).values(data).returning()
    const row = rows.at(0)
    if (!row) throw internalError()
    return chapterResponse(row)
  }

  public static async update(
    db: Database,
    chapterId: string,
    data: UpdateChapterData,
  ): Promise<Chapter> {
    const rows = await db.update(chapter).set(data).where(eq(chapter.id, chapterId)).returning()
    const row = rows.at(0)
    if (!row) throw internalError()
    return chapterResponse(row)
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

    if (!existing) throw notFound()
    // The upload route overwrites the R2 object before this transaction runs, so there is a
    // brief window where R2 and the chapter row can disagree if this update fails.
    return await db.transaction(async tx => {
      await tx.delete(segment).where(eq(segment.chapterId, chapterId))
      const rows = await tx
        .update(chapter)
        .set({ script: scriptType, textObjectKey: objectKey })
        .where(eq(chapter.id, chapterId))
        .returning()

      const row = rows.at(0)
      if (!row) throw internalError()
      return chapterResponse(row)
    })
  }
}
