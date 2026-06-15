import { deleteObject, getDownloadUrl, getUploadUrl, objectExists } from '@narada/storage'
import { getRequestCachedValue } from '../requestContext'

const audioContentTypeExtMap = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
} as const

export type AudioContentType = keyof typeof audioContentTypeExtMap
export type UploadPurpose = 'chapterText' | 'audio'

export function audioObjectKey(input: {
  schoolId: string
  chapterId: string
  uploadId: string
  contentType: AudioContentType
}): string {
  const ext = audioContentTypeExtMap[input.contentType]
  return `schools/${input.schoolId}/chapters/${input.chapterId}/audio/${input.uploadId}.${ext}`
}

export function chapterTextObjectKey(input: {
  schoolId: string
  chapterId: string
  uploadId: string
}): string {
  return `schools/${input.schoolId}/chapters/${input.chapterId}/text/${input.uploadId}.txt`
}

export async function signedUploadUrl(
  objectKey: string,
  contentType: string,
): Promise<{ uploadUrl: string }> {
  return getUploadUrl(objectKey, contentType)
}

export async function signedDownloadUrl(objectKey: string): Promise<string> {
  return getRequestCachedValue(`download-url:${objectKey}`, () => getDownloadUrl(objectKey))
}

export async function storedObjectExists(objectKey: string): Promise<boolean> {
  return objectExists(objectKey)
}

export async function deleteStoredObject(objectKey: string): Promise<void> {
  await deleteObject(objectKey)
}
