import { audioAsset, type audioMapping } from '@narada/db'
import { signedDownloadUrl } from '../utils/contentStorage'

type DbAudioAsset = typeof audioAsset.$inferSelect
type DbAudioMapping = typeof audioMapping.$inferSelect

export type AudioAsset = DbAudioAsset & { url: string }
export type ChapterAudioAsset = Omit<AudioAsset, 'objectKey'> & {
  audioMappings: DbAudioMapping[]
}

export async function audioAssetResponse(row: DbAudioAsset): Promise<AudioAsset> {
  return {
    ...row,
    url: await signedDownloadUrl(row.objectKey),
  }
}

export async function chapterAudioAssetResponse(
  row: DbAudioAsset & { audioMappings: DbAudioMapping[] },
): Promise<ChapterAudioAsset> {
  const { objectKey: _objectKey, ...asset } = await audioAssetResponse(row)
  return {
    ...asset,
    audioMappings: row.audioMappings,
  }
}
