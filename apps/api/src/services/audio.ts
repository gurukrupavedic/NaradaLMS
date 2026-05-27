import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

import { audioAsset, type Database } from '@narada/db'
import { conflict, notFound, unprocessable } from '../error'
import { objectLifecycle } from '../utils/objectLifecycle'

const audioUploadIdSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp3|wav|aac|ogg|m4a)$/i,
  'Invalid audio upload id',
)

export const getUploadUrlSchema = z.object({
  contentType: z.enum(['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/mp4']),
})

export const createAudioAssetSchema = z.object({
  uploadId: audioUploadIdSchema,
  label: z.string().optional(),
  duration: z.number().positive(),
})

export type AudioAsset = typeof audioAsset.$inferSelect & { url: string }
export type GetUploadUrlData = z.infer<typeof getUploadUrlSchema>
export type CreateAudioAssetData = z.infer<typeof createAudioAssetSchema>
export type StoredAudioAsset = typeof audioAsset.$inferSelect

type DbAudioAsset = typeof audioAsset.$inferSelect

async function audioAssetResponse(row: DbAudioAsset): Promise<AudioAsset> {
  return {
    ...row,
    url: await objectLifecycle.urlFor(row.objectKey),
  }
}

export default class AudioService {
  public static async findById(
    db: Database,
    audioId: string,
    chapterId?: string,
  ): Promise<StoredAudioAsset | undefined> {
    return db.query.audioAsset.findFirst({
      where: (t, { and, eq }) =>
        chapterId === undefined ? eq(t.id, audioId) : and(eq(t.id, audioId), eq(t.chapterId, chapterId)),
    })
  }

  public static async getUploadUrl(
    schoolId: string,
    chapterId: string,
    contentType: GetUploadUrlData['contentType'],
  ): Promise<{ uploadUrl: string; uploadId: string }> {
    return objectLifecycle.stageAudioUpload({ schoolId, chapterId, contentType })
  }

  public static async create(
    db: Database,
    schoolId: string,
    chapterId: string,
    data: CreateAudioAssetData,
  ): Promise<AudioAsset> {
    const objectKey = objectLifecycle.audioObjectKey({ schoolId, chapterId, uploadId: data.uploadId })
    const exists = await objectLifecycle.objectExists(objectKey)
    if (!exists) throw unprocessable('uploaded audio object does not exist')

    const rows = await db
      .insert(audioAsset)
      .values({
        chapterId,
        objectKey,
        label: data.label,
        duration: data.duration,
      })
      .onConflictDoNothing()
      .returning()

    const row = rows.at(0)
    if (!row) throw conflict('audio asset already exists for this upload')
    return audioAssetResponse(row)
  }

  public static async remove(db: Database, audioId: string, chapterId: string): Promise<void> {
    const asset = await AudioService.findById(db, audioId, chapterId)
    if (!asset) throw notFound()
    await objectLifecycle.deleteObject(asset.objectKey)
    await db
      .delete(audioAsset)
      .where(and(eq(audioAsset.id, audioId), eq(audioAsset.chapterId, chapterId)))
  }
}
