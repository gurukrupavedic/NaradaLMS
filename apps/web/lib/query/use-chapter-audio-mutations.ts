'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  confirmChapterAudioUpload,
  deleteChapterAudioAsset,
  presignChapterAudioUpload,
  setChapterAudioMappings,
} from '@/lib/api/resources'
import type { ApiAudioMapping, ApiChapterDetail } from '@/lib/api/api-types'
import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'

/**
 * Committing a tap-to-stamp mapping is the same "feels broken if it waits" shape
 * `use-catalog-mutations.ts` documents: the armed segment has to advance the instant you tap, not
 * after a round trip. Same onMutate/onError shape as that file's `useCatalogMutation` — but
 * deliberately no settle-time invalidation: every audio asset's `url` is a freshly-signed R2 link
 * on every response (see `ApiAudioAsset`'s own doc comment), so refetching after a successful tap
 * would hand `useTransport` a new source for the *same* recording and reset playback to 0 mid-take.
 * The optimistic write already matches what the server just confirmed (both apply the same full
 * mapping list), so there's nothing a refetch would correct that's worth that cost.
 */
function useChapterAudioMutation<TVariables>(
  chapterId: string,
  request: (variables: TVariables) => Promise<unknown>,
  apply: (detail: ApiChapterDetail, variables: TVariables) => ApiChapterDetail,
) {
  const queryClient = useQueryClient()
  const queryKey = keys.chapterAudio.detail(chapterId)

  return useMutation({
    mutationFn: request,

    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ApiChapterDetail>(queryKey)
      if (previous) {
        queryClient.setQueryData<ApiChapterDetail>(queryKey, apply(previous, variables))
      }
      return { previous }
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
  })
}

/** The tap-to-stamp mapper's one mutation — always sends the complete mapping list for the audio
 * asset being edited, never a diff (mirrors `useSetAssignments` in
 * `use-doc-chapter-segment-mutations.ts`). */
export function useSetAudioMappings(chapterId: string) {
  return useChapterAudioMutation<{ audioId: string; mappings: ApiAudioMapping[] }>(
    chapterId,
    ({ audioId, mappings }) => setChapterAudioMappings(chapterId, audioId, mappings),
    (detail, { audioId, mappings }) => ({
      ...detail,
      audio: detail.audio.map(asset => (asset.id === audioId ? { ...asset, mappings } : asset)),
    }),
  )
}

/**
 * Adding a recording is a deliberate, one-shot action (pick a file, name the reciter, submit) —
 * `useEditMutation`'s toast-and-hold shape, not the instant-feel pattern above. Presign, the PUT,
 * and confirm are all steps of that one action.
 */
export function useUploadChapterAudio(chapterId: string) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: async (input: { file: File; label: string; reciter: string }) => {
        const { uploadId, uploadUrl } = await presignChapterAudioUpload(chapterId, input.file.type)
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': input.file.type },
          body: input.file,
        })
        if (!response.ok) throw new Error(`upload to storage failed (${response.status})`)
        return confirmChapterAudioUpload(chapterId, {
          uploadId,
          label: input.label.trim() || null,
          reciter: input.reciter.trim(),
        })
      },
      onSuccess: asset => {
        queryClient.setQueryData<ApiChapterDetail>(keys.chapterAudio.detail(chapterId), detail =>
          detail ? { ...detail, audio: [...detail.audio, asset] } : detail,
        )
      },
    },
    { success: 'Recording uploaded.', failure: "Couldn't upload that recording." },
  )
}

export function useDeleteChapterAudioAsset(chapterId: string) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (audioId: string) => deleteChapterAudioAsset(chapterId, audioId),
      onSuccess: (_void, audioId) => {
        queryClient.setQueryData<ApiChapterDetail>(keys.chapterAudio.detail(chapterId), detail =>
          detail ? { ...detail, audio: detail.audio.filter(asset => asset.id !== audioId) } : detail,
        )
      },
    },
    { success: 'Recording deleted.', failure: "Couldn't delete that recording." },
  )
}
