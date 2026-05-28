import { audioAsset, type audioMapping } from '@narada/db'
import { objectLifecycle } from './objectLifecycle'

type DbAudioAsset = typeof audioAsset.$inferSelect
type DbAudioMapping = typeof audioMapping.$inferSelect

export type AudioAsset = DbAudioAsset & { url: string }
export type ChapterAudioAsset = Omit<AudioAsset, 'objectKey'> & {
  audioMappings: DbAudioMapping[]
}

export async function audioAssetResponse(row: DbAudioAsset): Promise<AudioAsset> {
  return {
    ...row,
    url: await objectLifecycle.urlFor(row.objectKey),
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
