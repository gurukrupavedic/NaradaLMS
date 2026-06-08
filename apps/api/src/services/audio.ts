import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

import { audioAsset, type SchoolDbExecutor } from '@narada/db'
import { internalError, notFound, unprocessable } from '../error'
import { objectLifecycle } from './objectLifecycle'
import { audioAssetResponse, type AudioAsset } from './audioResponses'

const audioUploadIdSchema = z
  .string()
  .regex(
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

export type GetUploadUrlData = z.infer<typeof getUploadUrlSchema>
export type CreateAudioAssetData = z.infer<typeof createAudioAssetSchema>
export type StoredAudioAsset = typeof audioAsset.$inferSelect
export type CreateAudioAssetResult = { asset: AudioAsset; created: boolean }

export async function findAudioAssetById(
  db: SchoolDbExecutor,
  audioId: string,
  chapterId?: string,
): Promise<StoredAudioAsset | undefined> {
  return db.query.audioAsset.findFirst({
    where: (t, { and, eq }) =>
      chapterId === undefined
        ? eq(t.id, audioId)
        : and(eq(t.id, audioId), eq(t.chapterId, chapterId)),
  })
}

export async function getAudioUploadUrl(
  schoolId: string,
  chapterId: string,
  contentType: GetUploadUrlData['contentType'],
): Promise<{ uploadUrl: string; uploadId: string }> {
  return objectLifecycle.stageAudioUpload({ schoolId, chapterId, contentType })
}

export async function createAudioAsset(
  db: SchoolDbExecutor,
  schoolId: string,
  chapterId: string,
  data: CreateAudioAssetData,
): Promise<CreateAudioAssetResult> {
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
  if (row) {
    return { asset: await audioAssetResponse(row), created: true }
  }

  const existing = await db.query.audioAsset.findFirst({
    where: (t, { and, eq }) => and(eq(t.chapterId, chapterId), eq(t.objectKey, objectKey)),
  })

  if (!existing) throw internalError()
  return { asset: await audioAssetResponse(existing), created: false }
}

export async function removeAudioAsset(
  db: SchoolDbExecutor,
  audioId: string,
  chapterId: string,
): Promise<void> {
  const asset = await findAudioAssetById(db, audioId, chapterId)
  if (!asset) throw notFound()
  await db
    .delete(audioAsset)
    .where(and(eq(audioAsset.id, audioId), eq(audioAsset.chapterId, chapterId)))
  await objectLifecycle.deleteObject(asset.objectKey)
}
