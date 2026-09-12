import { queryOptions } from '@tanstack/react-query'

import {
  fetchAdminBatch,
  fetchAdminBatches,
  fetchAuthProfile,
  fetchCatalogTrack,
  fetchCatalogTracks,
  fetchChapter,
  fetchChapterDetail,
  fetchDashboard,
  fetchExams,
  fetchRegistration,
  fetchRegistrations,
} from '@/lib/api/resources'
import type { ApiRegistrationStatus } from '@/lib/api/api-types'

/**
 * Query keys, in one place.
 *
 * A key factory rather than string literals scattered across components: an
 * invalidation is only correct if it uses the same key the query registered
 * under, and a typo in a literal fails silently — the mutation succeeds, the
 * screen keeps showing stale data, and nothing errors. Hierarchical keys also
 * make partial invalidation possible: `keys.catalog.all` clears every catalog
 * query, `keys.catalog.track(id)` clears exactly one.
 */
export const keys = {
  dashboard: ['dashboard'] as const,

  authProfile: ['authProfile'] as const,

  chapters: {
    all: ['chapters'] as const,
    detail: (id: string) => ['chapters', id] as const,
    // Deliberately its own key, not `detail(id)` — the admin authoring panel and the student
    // practice room can both be open for the same chapter id in one session, and they fetch
    // different shapes (`ApiChapterDetail` vs `ChapterContent`) from different resource functions.
    // Sharing a key would mean whichever query mounted last silently overwrites the other's cache
    // entry with the wrong shape.
    authoringDetail: (id: string) => ['chapters', id, 'authoring'] as const,
  },

  exams: ['exams'] as const,

  batches: {
    all: ['batches'] as const,
    detail: (code: string) => ['batches', code] as const,
  },

  catalog: {
    all: ['catalog'] as const,
    list: () => ['catalog', 'list'] as const,
    track: (id: string) => ['catalog', 'track', id] as const,
  },

  registrations: {
    // Prefix key — an approve/reject mutation invalidates this to catch every list (whichever
    // status tab) and every detail query at once, rather than enumerating all three statuses.
    all: ['registrations'] as const,
    list: (status: ApiRegistrationStatus) => ['registrations', 'list', status] as const,
    detail: (id: string) => ['registrations', 'detail', id] as const,
  },
} as const

/**
 * `queryOptions()` pairs a key with its fetcher and infers the data type from
 * it. Server prefetch and client hooks then reference the *same* object, so a
 * key can never drift from the function that populates it — the failure mode
 * where a page prefetches `['tracks', id]` and the component subscribes to
 * `['track', id]`, hydrates nothing, and refetches everything on mount.
 */

// A syllabus changes a few times a year. Refetching it on every navigation is
// pure waste, so these carry a much longer staleTime than the 60s default.
const CATALOG_STALE_TIME = 10 * 60_000

export const dashboardQuery = () =>
  queryOptions({
    queryKey: keys.dashboard,
    queryFn: fetchDashboard,
  })

// An account's role changes rarely if ever during a session, so this can sit at the same
// long staleTime as the catalog rather than the 60s default.
export const authProfileQuery = () =>
  queryOptions({
    queryKey: keys.authProfile,
    queryFn: fetchAuthProfile,
    staleTime: CATALOG_STALE_TIME,
  })

export const chapterQuery = (chapterId: string) =>
  queryOptions({
    queryKey: keys.chapters.detail(chapterId),
    queryFn: () => fetchChapter(chapterId),
    // Chapter text and audio mappings are immutable once published — there is
    // nothing to refetch for.
    staleTime: Infinity,
  })

// The authoring panel's own view of a chapter — unlike `chapterQuery` above, this is the thing
// being edited, so it refetches normally (the 60s default) rather than sitting at `Infinity`.
export const chapterAuthoringDetailQuery = (chapterId: string) =>
  queryOptions({
    queryKey: keys.chapters.authoringDetail(chapterId),
    queryFn: () => fetchChapterDetail(chapterId),
  })

export const examsQuery = () =>
  queryOptions({
    queryKey: keys.exams,
    queryFn: fetchExams,
  })

export const adminBatchesQuery = () =>
  queryOptions({
    queryKey: keys.batches.all,
    queryFn: fetchAdminBatches,
  })

export const adminBatchQuery = (code: string) =>
  queryOptions({
    queryKey: keys.batches.detail(code),
    queryFn: () => fetchAdminBatch(code),
  })

export const catalogTracksQuery = () =>
  queryOptions({
    queryKey: keys.catalog.list(),
    queryFn: fetchCatalogTracks,
    staleTime: CATALOG_STALE_TIME,
  })

export const catalogTrackQuery = (trackId: string) =>
  queryOptions({
    queryKey: keys.catalog.track(trackId),
    queryFn: () => fetchCatalogTrack(trackId),
    staleTime: CATALOG_STALE_TIME,
  })

export const registrationsQuery = (status: ApiRegistrationStatus) =>
  queryOptions({
    queryKey: keys.registrations.list(status),
    queryFn: () => fetchRegistrations(status),
  })

export const registrationQuery = (id: string) =>
  queryOptions({
    queryKey: keys.registrations.detail(id),
    queryFn: () => fetchRegistration(id),
  })
