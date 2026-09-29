import { getDownloadUrl } from '@narada/storage'

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
