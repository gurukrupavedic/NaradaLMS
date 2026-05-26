import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

import { audioAsset, type Database } from '@narada/db'
import {
  getUploadUrl as getPresignedUploadUrl,
  getDownloadUrl,
  deleteObject,
} from '@narada/storage'
import { badRequest, notFound } from '../error'

const contentTypeExtMap = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
} as const

export const getUploadUrlSchema = z.object({
  contentType: z.enum(['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/mp4']),
})

export const createAudioAssetSchema = z.object({
  objectKey: z.string().min(1),
  label: z.string().optional(),
  duration: z.number().positive(),
})

export type AudioAsset = typeof audioAsset.$inferSelect & { url: string }
export type GetUploadUrlData = z.infer<typeof getUploadUrlSchema>
export type CreateAudioAssetData = z.infer<typeof createAudioAssetSchema>

type DbAudioAsset = typeof audioAsset.$inferSelect

async function audioAssetResponse(row: DbAudioAsset): Promise<AudioAsset> {
  return {
    ...row,
    url: await getDownloadUrl(row.objectKey),
  }
}

export default class AudioService {
  public static async getUploadUrl(
    schoolId: string,
    chapterId: string,
    contentType: GetUploadUrlData['contentType'],
  ): Promise<{ uploadUrl: string; objectKey: string }> {
    const ext = contentTypeExtMap[contentType]
    const objectKey = `schools/${schoolId}/chapters/${chapterId}/audio/${crypto.randomUUID()}.${ext}`
    const { uploadUrl } = await getPresignedUploadUrl(objectKey, contentType)
    return { uploadUrl, objectKey }
  }

  public static async create(
    db: Database,
    schoolId: string,
    chapterId: string,
    data: CreateAudioAssetData,
  ): Promise<AudioAsset> {
    const expectedPrefix = `schools/${schoolId}/chapters/${chapterId}/audio/`
    if (!data.objectKey.startsWith(expectedPrefix)) {
      throw badRequest()
    }

    const rows = await db
      .insert(audioAsset)
      .values({
        chapterId,
        objectKey: data.objectKey,
        label: data.label,
        duration: data.duration,
      })
      .returning()

    const row = rows.at(0)!
    return audioAssetResponse(row)
  }

  public static async remove(db: Database, audioId: string, chapterId: string): Promise<void> {
    const asset = await db.query.audioAsset.findFirst({
      where: (t, { and, eq }) => and(eq(t.id, audioId), eq(t.chapterId, chapterId)),
    })

    if (!asset) throw notFound()
    // TODO: see architecture-review §5.E for the longer-term object lifecycle module.
    await deleteObject(asset.objectKey)
    await db
      .delete(audioAsset)
      .where(and(eq(audioAsset.id, audioId), eq(audioAsset.chapterId, chapterId)))
  }
}
