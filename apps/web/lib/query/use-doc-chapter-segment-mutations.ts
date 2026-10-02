'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  deleteDocChapterSegment,
  mergeDocChapterSegmentWithNext,
  splitDocChapterSegment,
} from '@/lib/api/resources'
import type { ApiDocChapterDetail, ApiScriptKey } from '@/lib/api/api-types'
import { keys } from '@/lib/query/options'
import { notify } from '@/lib/toast'

/**
 * Cleaning up a doc chapter's text is a burst of small, near-instant edits — split this line,
 * merge those two, delete that one — the same "feels broken if it waits" shape
 * `use-catalog-mutations.ts` documents for the track editor. Not optimistic the same way, though:
 * predicting a split's new segment id (server-generated) or the renumbering split/merge/delete all
 * trigger would mean re-implementing that logic client-side just to guess at it. Instead, each
 * mutation's response is already the complete, authoritative post-edit detail (every endpoint
 * returns the whole doc chapter, not just what changed), so the response is written straight into
 * the cache rather than invalidating and waiting on a second round trip.
 */
function useDocChapterDetailMutation<TVariables>(
  docChapterId: string,
  mutationFn: (variables: TVariables) => Promise<ApiDocChapterDetail>,
) {
  const queryClient = useQueryClient()
  const queryKey = keys.docChapters.detail(docChapterId)

  return useMutation({
    mutationFn,
    onSuccess: detail => {
      queryClient.setQueryData(queryKey, detail)
    },
    onError: () => {
      notify.error("Couldn't save that change.")
    },
  })
}

export function useSplitSegment(docChapterId: string) {
  return useDocChapterDetailMutation(
    docChapterId,
    (variables: { segmentId: string; script: ApiScriptKey; wordIndex: number }) =>
      splitDocChapterSegment(docChapterId, variables.segmentId, variables.script, variables.wordIndex),
  )
}

export function useMergeSegmentWithNext(docChapterId: string) {
  return useDocChapterDetailMutation(docChapterId, (segmentId: string) =>
    mergeDocChapterSegmentWithNext(docChapterId, segmentId),
  )
}

export function useDeleteSegment(docChapterId: string) {
  return useDocChapterDetailMutation(docChapterId, (segmentId: string) =>
    deleteDocChapterSegment(docChapterId, segmentId),
  )
}
