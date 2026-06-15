import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { stagedUpload, type SchoolDbExecutor, uuidv7 } from '@narada/db'
import { internalError, notFound, unprocessable } from '../error'
import {
  type AudioContentType,
  audioObjectKey,
  chapterTextObjectKey,
  signedUploadUrl,
  storedObjectExists,
  type UploadPurpose,
} from '../utils/contentStorage'

const UPLOAD_TTL_MS = 60 * 60 * 1000

export const createChapterTextUploadSchema = z
  .object({
    contentType: z.literal('text/plain').default('text/plain'),
  })
  .default({ contentType: 'text/plain' })

export const createAudioUploadSchema = z.object({
  contentType: z.enum(['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/mp4']),
})

export const completeUploadSchema = z.object({
  uploadId: z.uuid(),
})

export type CreateChapterTextUploadData = z.infer<typeof createChapterTextUploadSchema>
export type CreateAudioUploadData = z.infer<typeof createAudioUploadSchema>
export type CompleteUploadData = z.infer<typeof completeUploadSchema>
export type StagedUploadResult = {
  uploadId: string
  uploadUrl: string
  expiresAt: Date
}

type StoredStagedUpload = typeof stagedUpload.$inferSelect

export async function createChapterTextUpload(
  db: SchoolDbExecutor,
  input: {
    schoolId: string
    chapterId: string
    userId: string
    contentType: CreateChapterTextUploadData['contentType']
  },
): Promise<StagedUploadResult> {
  return createStagedUpload(db, {
    ...input,
    purpose: 'chapterText',
  })
}

export async function createAudioUpload(
  db: SchoolDbExecutor,
  input: {
    schoolId: string
    chapterId: string
    userId: string
    contentType: CreateAudioUploadData['contentType']
  },
): Promise<StagedUploadResult> {
  return createStagedUpload(db, {
    ...input,
    purpose: 'audio',
  })
}

export async function completeStagedUpload(
  db: SchoolDbExecutor,
  input: {
    schoolId: string
    chapterId: string
    uploadId: string
    purpose: UploadPurpose
  },
): Promise<{ upload: StoredStagedUpload; objectKey: string; completed: boolean }> {
  const upload = await db.query.stagedUpload.findFirst({
    where: (t, { and, eq }) =>
      and(
        eq(t.id, input.uploadId),
        eq(t.schoolId, input.schoolId),
        eq(t.chapterId, input.chapterId),
        eq(t.purpose, input.purpose),
      ),
  })

  if (!upload) throw notFound()
  if (upload.status === 'completed') {
    return { upload, objectKey: upload.objectKey, completed: false }
  }

  if (upload.status !== 'pending') throw unprocessable('Upload has already been completed or expired')
  if (upload.expiresAt <= new Date()) {
    await db
      .update(stagedUpload)
      .set({ status: 'expired' })
      .where(eq(stagedUpload.id, upload.id))
    throw unprocessable('Upload has expired')
  }

  const exists = await storedObjectExists(upload.objectKey)
  if (!exists) throw unprocessable('Uploaded object does not exist')

  const updated = await db
    .update(stagedUpload)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(stagedUpload.id, upload.id))
    .returning()

  const row = updated.at(0)
  if (!row) throw internalError()
  return { upload: row, objectKey: row.objectKey, completed: true }
}

async function createStagedUpload(
  db: SchoolDbExecutor,
  input: {
    schoolId: string
    chapterId: string
    userId: string
    purpose: UploadPurpose
    contentType: string
  },
): Promise<StagedUploadResult> {
  const existingChapter = await db.query.chapter.findFirst({
    where: (t, { eq }) => eq(t.id, input.chapterId),
    columns: { id: true },
  })

  if (!existingChapter) throw notFound()
  const uploadId = uuidv7()
  const expiresAt = new Date(Date.now() + UPLOAD_TTL_MS)
  const objectKey = objectKeyFor({
    schoolId: input.schoolId,
    chapterId: input.chapterId,
    uploadId,
    purpose: input.purpose,
    contentType: input.contentType,
  })

  const rows = await db
    .insert(stagedUpload)
    .values({
      id: uploadId,
      schoolId: input.schoolId,
      chapterId: input.chapterId,
      purpose: input.purpose,
      objectKey,
      contentType: input.contentType,
      createdByUserId: input.userId,
      expiresAt,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw internalError()
  const { uploadUrl } = await signedUploadUrl(objectKey, input.contentType)
  return { uploadId: row.id, uploadUrl, expiresAt: row.expiresAt }
}

function objectKeyFor(input: {
  schoolId: string
  chapterId: string
  uploadId: string
  purpose: UploadPurpose
  contentType: string
}): string {
  if (input.purpose === 'chapterText') {
    return chapterTextObjectKey(input)
  }

  return audioObjectKey({
    ...input,
    contentType: input.contentType as AudioContentType,
  })
}
