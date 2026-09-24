import { mutateApi } from '@/lib/api/client'
import type { ApiAudioAsset, ApiChapterDetail, ApiScriptKey } from '@/lib/api/api-types'

export type SaveChapterScriptInput = {
  label: string
  short: string
  fontClass: string
  text: string
  segments: { start: number; end: number }[]
}

// PUT /v1/chapters/:chapterId/scripts/:script
export async function saveChapterScript(
  chapterId: string,
  script: ApiScriptKey,
  data: SaveChapterScriptInput,
): Promise<ApiChapterDetail> {
  return mutateApi<ApiChapterDetail>(`/chapters/${chapterId}/scripts/${script}`, 'PUT', data)
}

// POST /v1/chapters/:chapterId/audio/presign
export async function presignChapterAudioUpload(
  chapterId: string,
  contentType: string,
): Promise<{ uploadId: string; uploadUrl: string; expiresAt: string }> {
  return mutateApi(`/chapters/${chapterId}/audio/presign`, 'POST', { contentType })
}

// POST /v1/chapters/:chapterId/audio — confirms a presigned upload and creates the audio asset.
// No client-reported `duration` — the server derives it from the uploaded bytes themselves.
export async function createChapterAudioAsset(
  chapterId: string,
  data: { uploadId: string; label: string | null; reciter: string },
): Promise<ApiAudioAsset> {
  return mutateApi<ApiAudioAsset>(`/chapters/${chapterId}/audio`, 'POST', data)
}

// PUT /v1/chapters/:chapterId/audio/:audioId/mappings — full replace.
export async function setChapterAudioMappings(
  chapterId: string,
  audioId: string,
  mappings: { segmentId: string; audioStart: number; audioEnd: number }[],
): Promise<ApiAudioAsset> {
  return mutateApi<ApiAudioAsset>(`/chapters/${chapterId}/audio/${audioId}/mappings`, 'PUT', {
    mappings,
  })
}

// DELETE /v1/chapters/:chapterId/audio/:audioId
export async function deleteChapterAudioAsset(chapterId: string, audioId: string): Promise<void> {
  await mutateApi<void>(`/chapters/${chapterId}/audio/${audioId}`, 'DELETE')
}

// PUT /v1/chapters/:chapterId/resegment — resizes the chapter's whole segment timeline at once,
// across every script that already has one. Wipes every existing audio mapping on the chapter (the
// server cascades this; nothing here needs to know that beyond the type not carrying mappings back).
export type ResegmentChapterInput = {
  scripts: Partial<Record<ApiScriptKey, { segments: { start: number; end: number }[] }>>
}

export async function resegmentChapter(
  chapterId: string,
  data: ResegmentChapterInput,
): Promise<ApiChapterDetail> {
  return mutateApi<ApiChapterDetail>(`/chapters/${chapterId}/resegment`, 'PUT', data)
}
