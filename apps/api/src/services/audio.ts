import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

import { audioAsset, type SchoolDbExecutor } from '@narada/db'
import { internalError, notFound } from '../error'
import { deleteStoredObject } from '../utils/contentStorage'
import { audioAssetResponse, type AudioAsset } from './audioResponses'
import { completeStagedUpload } from './stagedUpload'

export const createAudioAssetSchema = z.object({
  uploadId: z.uuid(),
  label: z.string().optional(),
  duration: z.number().positive(),
})

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

export async function createAudioAsset(
  db: SchoolDbExecutor,
  schoolId: string,
  chapterId: string,
  data: CreateAudioAssetData,
): Promise<CreateAudioAssetResult> {
  return await db.transaction(async tx => {
    const { objectKey } = await completeStagedUpload(tx, {
      schoolId,
      chapterId,
      uploadId: data.uploadId,
      purpose: 'audio',
    })

    const rows = await tx
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

    const existing = await tx.query.audioAsset.findFirst({
      where: (t, { and, eq }) => and(eq(t.chapterId, chapterId), eq(t.objectKey, objectKey)),
    })

    if (!existing) throw internalError()
    return { asset: await audioAssetResponse(existing), created: false }
  })
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

  await deleteStoredObject(asset.objectKey)
}
