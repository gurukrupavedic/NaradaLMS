import { fetchApi, mutateApi } from '@/lib/api/client'
import type { ApiAudioAsset, ApiAudioMapping, ApiAudioPresignResponse, ApiChapterDetail } from '@/lib/api/api-types'

// The admin audio-mapping workspace's raw read of a chapter — distinct from `fetchChapter`
// (lib/api/resources/dashboard.ts), which reshapes the same endpoint for a *reader*
// (proficiency, resume position). This is the unshaped response, for editing.
export async function fetchChapterAudioDetail(chapterId: string): Promise<ApiChapterDetail> {
  return fetchApi<ApiChapterDetail>(`/chapters/${encodeURIComponent(chapterId)}`)
}

export async function presignChapterAudioUpload(
  chapterId: string,
  contentType: string,
): Promise<ApiAudioPresignResponse> {
  return mutateApi<ApiAudioPresignResponse>(`/chapters/${encodeURIComponent(chapterId)}/audio/presign`, 'POST', {
    contentType,
  })
}

export async function confirmChapterAudioUpload(
  chapterId: string,
  data: { uploadId: string; label: string | null; reciter: string },
): Promise<ApiAudioAsset> {
  return mutateApi<ApiAudioAsset>(`/chapters/${encodeURIComponent(chapterId)}/audio`, 'POST', data)
}

/** Always the complete mapping list for this audio asset, never a diff — `setAudioMappings` on
 * the server replaces the whole set. */
export async function setChapterAudioMappings(
  chapterId: string,
  audioId: string,
  mappings: ApiAudioMapping[],
): Promise<ApiAudioAsset> {
  return mutateApi<ApiAudioAsset>(
    `/chapters/${encodeURIComponent(chapterId)}/audio/${encodeURIComponent(audioId)}/mappings`,
    'PUT',
    { mappings },
  )
}

export async function deleteChapterAudioAsset(chapterId: string, audioId: string): Promise<void> {
  return mutateApi<void>(`/chapters/${encodeURIComponent(chapterId)}/audio/${encodeURIComponent(audioId)}`, 'DELETE')
}
