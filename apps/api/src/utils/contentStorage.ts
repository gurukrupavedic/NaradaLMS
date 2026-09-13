import { deleteObject, getDownloadUrl, getObject, getUploadUrl, objectExists } from '@narada/storage'

/**
 * Turns an audio asset's R2 object key into a temporary signed download URL — the only thing the
 * read path needs from `@narada/storage`. Chapter script *text* lives directly in Postgres
 * (`chapterScript.text`), not in R2, so it never goes through this.
 *
 * No per-request signing cache here (the old, since-cut `apps/api` had one): `audioAsset.chapterId`
 * is a required FK, so one chapter's detail response signs each asset's key exactly once by
 * construction — there's no duplicate-key risk yet to justify it. Add one if a future endpoint
 * ever signs the same key more than once per request.
 */
export function signedDownloadUrl(objectKey: string): Promise<string> {
  return getDownloadUrl(objectKey)
}

const AUDIO_CONTENT_TYPE_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
}

export type AudioContentType = keyof typeof AUDIO_CONTENT_TYPE_EXT

/** Deterministic R2 key for one staged audio upload — `schoolSlug` is a readability convenience for the R2 console, not a security boundary (the real tenant boundary is `stagedUpload`/`audioAsset.chapterId`'s FK). */
export function audioObjectKey(input: {
  schoolSlug: string
  chapterId: string
  uploadId: string
  contentType: AudioContentType
}): string {
  const ext = AUDIO_CONTENT_TYPE_EXT[input.contentType]
  return `schools/${input.schoolSlug}/chapters/${input.chapterId}/audio/${input.uploadId}.${ext}`
}

// 30 minutes, not @narada/storage's own 15-minute default — a large audio file on a slow
// connection shouldn't race the presigned URL's own expiry.
const UPLOAD_URL_EXPIRY_SECONDS = 60 * 30

export async function signedUploadUrl(objectKey: string, contentType: string): Promise<{ uploadUrl: string }> {
  return getUploadUrl(objectKey, contentType, UPLOAD_URL_EXPIRY_SECONDS)
}

export function storedObjectExists(objectKey: string): Promise<boolean> {
  return objectExists(objectKey)
}

/** The uploaded bytes themselves, for a caller that needs to inspect content server-side (see `utils/audioMetadata.ts`) — `storedObjectExists` above only confirms the key is present, never reads it. */
export function readStoredObjectBytes(objectKey: string): Promise<Buffer> {
  return getObject(objectKey)
}

export function deleteStoredObject(objectKey: string): Promise<void> {
  return deleteObject(objectKey)
}
