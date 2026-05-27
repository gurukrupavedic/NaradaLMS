import { audioAsset, chapter, type SchoolDatabase } from '@narada/db'
import {
  deleteObject,
  getDownloadUrl,
  getUploadUrl,
  listObjectSummaries,
  objectExists,
} from '@narada/storage'

const ORPHAN_SAFETY_WINDOW_MS = 60 * 60 * 1000

const audioContentTypeExtMap = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
} as const

export type AudioContentType = keyof typeof audioContentTypeExtMap
export type AudioUploadId = `${string}.${(typeof audioContentTypeExtMap)[AudioContentType]}`

export type ObjectJanitorResult = {
  prefix: string
  referencedKeys: string[]
  orphanKeys: string[]
  deletedKeys: string[]
}

async function referencedObjectKeys(db: SchoolDatabase): Promise<Set<string>> {
  const [chapters, audioAssets] = await Promise.all([
    db.select({ objectKey: chapter.textObjectKey }).from(chapter),
    db.select({ objectKey: audioAsset.objectKey }).from(audioAsset),
  ])

  return new Set(
    [...chapters, ...audioAssets]
      .map(row => row.objectKey)
      .filter((key): key is string => key !== null),
  )
}

export const objectLifecycle = {
  audioObjectKey(input: { schoolId: string; chapterId: string; uploadId: string }): string {
    return `schools/${input.schoolId}/chapters/${input.chapterId}/audio/${input.uploadId}`
  },

  async stageAudioUpload(input: {
    schoolId: string
    chapterId: string
    contentType: AudioContentType
  }): Promise<{ uploadUrl: string; uploadId: AudioUploadId }> {
    const ext = audioContentTypeExtMap[input.contentType]
    const uploadId = `${crypto.randomUUID()}.${ext}` satisfies AudioUploadId
    const objectKey = objectLifecycle.audioObjectKey({ ...input, uploadId })
    const { uploadUrl } = await getUploadUrl(objectKey, input.contentType)
    return { uploadUrl, uploadId }
  },

  async stageChapterTextUpload(input: {
    schoolId: string
    chapterId: string
  }): Promise<{ uploadUrl: string; objectKey: string }> {
    const objectKey = `schools/${input.schoolId}/chapters/${input.chapterId}/text/${crypto.randomUUID()}.txt`
    const { uploadUrl } = await getUploadUrl(objectKey, 'text/plain')
    return { uploadUrl, objectKey }
  },

  async urlFor(objectKey: string): Promise<string> {
    return getDownloadUrl(objectKey)
  },

  async deleteObject(objectKey: string): Promise<void> {
    await deleteObject(objectKey)
  },

  async objectExists(objectKey: string): Promise<boolean> {
    return objectExists(objectKey)
  },

  async releaseOrphans(
    db: SchoolDatabase,
    schoolId: string,
    options: { dryRun?: boolean; safetyWindowMs?: number } = {},
  ): Promise<ObjectJanitorResult> {
    const prefix = `schools/${schoolId}/`
    const referencedKeys = await referencedObjectKeys(db)
    const storedObjects = await listObjectSummaries(prefix)
    const orphanCutoff = new Date(Date.now() - (options.safetyWindowMs ?? ORPHAN_SAFETY_WINDOW_MS))
    const orphanKeys = storedObjects
      .filter(object => !referencedKeys.has(object.key))
      .filter(object => object.lastModified !== null && object.lastModified <= orphanCutoff)
      .map(object => object.key)

    const deletedKeys: string[] = []
    if (!options.dryRun) {
      for (const key of orphanKeys) {
        await deleteObject(key)
        deletedKeys.push(key)
      }
    }

    return {
      prefix,
      referencedKeys: [...referencedKeys].sort(),
      orphanKeys,
      deletedKeys,
    }
  },
}
