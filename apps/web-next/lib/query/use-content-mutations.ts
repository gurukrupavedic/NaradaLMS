'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import {
  createChapterAudioAsset,
  deleteChapterAudioAsset,
  presignChapterAudioUpload,
  resegmentChapter,
  saveChapterScript,
  setChapterAudioMappings,
  type ResegmentChapterInput,
  type SaveChapterScriptInput,
} from '@/lib/api/resources'
import type { ApiScriptKey } from '@/lib/api/api-types'

/**
 * Content-authoring mutations — real writes against a real endpoint, unlike
 * `use-catalog-mutations.ts`'s optimistic pattern (built specifically to paper over that other
 * file's *mocked* 260ms latency). These show an honest pending state instead: real network
 * latency, no snapshot-and-rollback theater for an edit that might involve minutes of typed text
 * or a multi-megabyte file.
 *
 * Every mutation here invalidates both the authoring cache (`keys.chapters.authoringDetail`) and
 * the student-facing one (`keys.chapters.detail`) — a chapter already published is live for a
 * learner the moment its content changes, so both views need to see it.
 */
function invalidateChapter(queryClient: ReturnType<typeof useQueryClient>, chapterId: string) {
  void queryClient.invalidateQueries({ queryKey: keys.chapters.authoringDetail(chapterId) })
  void queryClient.invalidateQueries({ queryKey: keys.chapters.detail(chapterId) })
}

export function useSaveChapterScript(chapterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ script, data }: { script: ApiScriptKey; data: SaveChapterScriptInput }) =>
      saveChapterScript(chapterId, script, data),
    onSuccess: () => invalidateChapter(queryClient, chapterId),
  })
}

/** `fetch` has no upload-progress event — only `XMLHttpRequest` exposes byte-level progress on a PUT. */
function putWithProgress(url: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`upload to storage failed: ${xhr.status}`))
    xhr.onerror = () => reject(new Error('upload to storage failed: network error'))
    xhr.send(file)
  })
}

export type UploadChapterAudioInput = {
  file: File
  label: string | null
  reciter: string
  onProgress?: (percent: number) => void
}

/**
 * The full presign → PUT → confirm flow as one mutation. A presigned R2 PUT takes the raw file
 * bytes directly, no `FormData` — `Content-Type` just has to match what was presigned. Duration is
 * no longer read client-side (see `resources.ts`'s `createChapterAudioAsset` doc comment) — the
 * server derives it from the uploaded bytes.
 */
export function useUploadChapterAudio(chapterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, label, reciter, onProgress }: UploadChapterAudioInput) => {
      const { uploadId, uploadUrl } = await presignChapterAudioUpload(chapterId, file.type)
      await putWithProgress(uploadUrl, file, onProgress)
      return createChapterAudioAsset(chapterId, { uploadId, label, reciter })
    },
    onSuccess: () => invalidateChapter(queryClient, chapterId),
  })
}

export function useSetChapterAudioMappings(chapterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      audioId,
      mappings,
    }: {
      audioId: string
      mappings: { segmentId: string; audioStart: number; audioEnd: number }[]
    }) => setChapterAudioMappings(chapterId, audioId, mappings),
    onSuccess: () => invalidateChapter(queryClient, chapterId),
  })
}

export function useDeleteChapterAudioAsset(chapterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (audioId: string) => deleteChapterAudioAsset(chapterId, audioId),
    onSuccess: () => invalidateChapter(queryClient, chapterId),
  })
}

export function useResegmentChapter(chapterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ResegmentChapterInput) => resegmentChapter(chapterId, data),
    onSuccess: () => invalidateChapter(queryClient, chapterId),
  })
}
