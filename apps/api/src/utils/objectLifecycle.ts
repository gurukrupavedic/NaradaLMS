import { audioAsset, chapter, type Database } from '@narada/db'
import {
  deleteObject,
  getDownloadUrl,
  getUploadUrl,
  listObjectKeys,
} from '@narada/storage'

const audioContentTypeExtMap = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
} as const

export type AudioContentType = keyof typeof audioContentTypeExtMap

export type ObjectJanitorResult = {
  prefix: string
  referencedKeys: string[]
  orphanKeys: string[]
  deletedKeys: string[]
}

async function referencedObjectKeys(db: Database): Promise<Set<string>> {
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
  async stageAudioUpload(input: {
    schoolId: string
    chapterId: string
    contentType: AudioContentType
  }): Promise<{ uploadUrl: string; objectKey: string }> {
    const ext = audioContentTypeExtMap[input.contentType]
    const objectKey = `schools/${input.schoolId}/chapters/${input.chapterId}/audio/${crypto.randomUUID()}.${ext}`
    const { uploadUrl } = await getUploadUrl(objectKey, input.contentType)
    return { uploadUrl, objectKey }
  },

  async stageChapterTextUpload(input: {
    schoolId: string
    chapterId: string
  }): Promise<{ uploadUrl: string; objectKey: string }> {
    const objectKey = `schools/${input.schoolId}/chapters/${input.chapterId}/text.txt`
    const { uploadUrl } = await getUploadUrl(objectKey, 'text/plain')
    return { uploadUrl, objectKey }
  },

  async urlFor(objectKey: string): Promise<string> {
    return getDownloadUrl(objectKey)
  },

  async deleteObject(objectKey: string): Promise<void> {
    await deleteObject(objectKey)
  },

  async releaseOrphans(
    db: Database,
    schoolId: string,
    options: { dryRun?: boolean } = {},
  ): Promise<ObjectJanitorResult> {
    const prefix = `schools/${schoolId}/`
    const [storedKeys, referencedKeys] = await Promise.all([
      listObjectKeys(prefix),
      referencedObjectKeys(db),
    ])

    const orphanKeys = storedKeys.filter(key => !referencedKeys.has(key))
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
