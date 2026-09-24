'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import {
  createChapter,
  deleteChapter,
  saveChapter,
  saveChapterOrder,
  saveTrack,
} from '@/lib/api/resources'
import type { CatalogChapter, CatalogTrack } from '@/lib/models/catalog'

/**
 * Catalog mutations, all optimistic.
 *
 * Editing a syllabus is a burst of small, near-certain edits — publish this,
 * rename that, move a chapter up two rows. Waiting on a round trip for each one
 * makes the page feel broken even when it is working, so every mutation writes
 * to the cache immediately and reconciles afterwards.
 *
 * All five share one shape, which is the part worth getting right:
 *
 *   onMutate  — cancel in-flight refetches for this key (an older response
 *               landing after our write would clobber it), snapshot the
 *               previous value, apply the edit.
 *   onError   — restore the snapshot. Without this an optimistic UI simply lies
 *               when the server says no.
 *   onSettled — invalidate, so the server's version wins in the end.
 *
 * The cancel step is the one most often skipped and the one that produces the
 * strangest bug: an edit that reverts itself a moment later for no visible
 * reason.
 *
 * `useCatalogMutation` exists so that shape is written once. Each concrete hook
 * supplies only the request to send and the pure function that applies the same
 * change to the cached track — which also means the optimistic result and the
 * eventual server state are derived from the same description of the edit.
 */
function useCatalogMutation<TVariables>(
  trackId: string,
  request: (variables: TVariables, track: CatalogTrack) => Promise<void>,
  apply: (track: CatalogTrack, variables: TVariables) => CatalogTrack,
) {
  const queryClient = useQueryClient()
  const queryKey = keys.catalog.track(trackId)

  return useMutation({
    // React Query always fully awaits `onMutate` (below) before calling this, so the cache
    // already holds the post-edit state `onMutate` wrote by the time this reads it — the request
    // is built straight from that, not from calling `apply` a second time. Calling `apply` again
    // here would double the edit (e.g. a chapter reorder moving two steps instead of one) since
    // it would be applied on top of the already-applied optimistic write, not the pre-edit state.
    mutationFn: async (variables: TVariables) => {
      const next = queryClient.getQueryData<CatalogTrack>(queryKey)
      if (!next) return
      await request(variables, next)
    },

    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<CatalogTrack>(queryKey)

      if (previous) {
        queryClient.setQueryData<CatalogTrack>(queryKey, apply(previous, variables))
      }

      return { previous }
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
      // The catalog index shows per-track readiness counts, which any of these
      // edits can change.
      void queryClient.invalidateQueries({ queryKey: keys.catalog.list() })
    },
  })
}

export function useUpdateChapter(trackId: string) {
  return useCatalogMutation<{ id: string; patch: Partial<CatalogChapter> }>(
    trackId,
    ({ id, patch }) => saveChapter(id, patch),
    (track, { id, patch }) => ({
      ...track,
      chapters: track.chapters.map(c => (c.id === id ? { ...c, ...patch } : c)),
    }),
  )
}

export function useReorderChapters(trackId: string) {
  return useCatalogMutation<{ id: string; direction: -1 | 1 }>(
    trackId,
    (_variables, next) => saveChapterOrder(trackId, next.chapters.map(c => c.id)),
    (track, { id, direction }) => {
      const index = track.chapters.findIndex(c => c.id === id)
      const target = index + direction
      if (index === -1 || target < 0 || target >= track.chapters.length) return track

      const chapters = [...track.chapters]
      ;[chapters[index], chapters[target]] = [chapters[target], chapters[index]]
      return { ...track, chapters }
    },
  )
}

export function useAddChapter(trackId: string) {
  return useCatalogMutation<CatalogChapter>(
    trackId,
    chapter => createChapter(trackId, chapter),
    (track, chapter) => ({ ...track, chapters: [...track.chapters, chapter] }),
  )
}

export function useRemoveChapter(trackId: string) {
  return useCatalogMutation<{ id: string }>(
    trackId,
    ({ id }) => deleteChapter(id),
    (track, { id }) => ({ ...track, chapters: track.chapters.filter(c => c.id !== id) }),
  )
}

export function useUpdateTrack(trackId: string) {
  return useCatalogMutation<Partial<Pick<CatalogTrack, 'name' | 'subtitle'>>>(
    trackId,
    patch => saveTrack(trackId, patch),
    (track, patch) => ({ ...track, ...patch }),
  )
}
