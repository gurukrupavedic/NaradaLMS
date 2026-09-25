import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'

import {
  fetchAdminBatch,
  fetchAdminBatches,
  fetchAdminSittings,
  fetchAdminSittingsPage,
  fetchAuthProfile,
  fetchBatchClassifiers,
  fetchBatchesWithRoster,
  fetchCatalogTrack,
  fetchProfiles,
  fetchCatalogTracks,
  fetchChapter,
  fetchChapterDetail,
  fetchCourse,
  fetchCourses,
  fetchDashboard,
  fetchEligibleTrackIds,
  fetchEnrollmentRequests,
  fetchExams,
  fetchExamSlotRequests,
  fetchExamSlots,
  fetchMyCourses,
  fetchMyExamSlotRequests,
  fetchOpenBatches,
  fetchProfileDetail,
  fetchRegistration,
  fetchRegistrations,
  searchProfiles,
} from '@/lib/api/resources'
import type {
  ApiEnrollmentRequestStatus,
  ApiExamSlotRequestStatus,
  ApiExamSlotStatus,
  ApiRegistrationStatus,
} from '@/lib/api/api-types'

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

  // A school's courses change about as often as its syllabus does: a long staleTime, see `coursesQuery`.
  courses: ['courses'] as const,
  course: (slug: string) => ['courses', 'bySlug', slug] as const,
  // What one profile may pick from — per profile, because a shared household login switches between
  // children's profiles and each has its own courses.
  myCourses: (profileId: string) => ['courses', 'mine', profileId] as const,

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
  // Under the `exams` prefix so one invalidation of `exams` refreshes the student's own exams page and
  // the admin grading screen together (a result recorded changes both).
  adminExams: ['exams', 'admin'] as const,
  // The admin exams screen's own paginated awaiting/graded lists — one cache entry (and one reset
  // pagination run) per graded/query combination, the same keyed-on-query-text shape as
  // `profiles.search` below.
  adminExamsPage: (graded: boolean, query: string) =>
    ['exams', 'admin', 'page', graded, query] as const,

  // Under the `exams` prefix so recording a result (which rewrites chapter levels) refreshes it.
  examEligibility: ['exams', 'eligibility'] as const,

  examSlots: {
    // Prefix key — opening, cancelling, or approving/rejecting a request against a slot all
    // change what this list shows, so a mutation invalidates the whole prefix rather than
    // enumerating every trackId/status combination a screen happens to be filtered to.
    all: ['examSlots'] as const,
    list: (trackId?: string, status?: ApiExamSlotStatus) =>
      ['examSlots', 'list', trackId ?? null, status ?? null] as const,
  },

  examSlotRequests: {
    // Same prefix-key shape as `registrations`/`enrollmentRequests` above.
    all: ['examSlotRequests'] as const,
    list: (status: ApiExamSlotRequestStatus) => ['examSlotRequests', 'list', status] as const,
    // The signed-in profile's own requests (exams-screen.tsx's "My requests") — a distinct cache
    // entry from `list` above, which is always the school-wide admin view regardless of status.
    mine: ['examSlotRequests', 'mine'] as const,
  },

  batches: {
    all: ['batches'] as const,
    detail: (code: string) => ['batches', code] as const,
    open: ['batches', 'open'] as const,
    // The command palette's own batch/student search — a distinct cache entry from `all` above
    // even though it hits the same endpoint, since it keeps the raw roster `all`'s own fetcher
    // discards after reshaping (see `fetchBatchesWithRoster`'s doc comment).
    withRoster: ['batches', 'withRoster'] as const,
    classifiers: ['batches', 'classifiers'] as const,
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

  enrollmentRequests: {
    // Same prefix-key shape as `registrations` above — an approve/reject mutation invalidates
    // this to catch every status tab at once.
    all: ['enrollmentRequests'] as const,
    list: (status: ApiEnrollmentRequestStatus) => ['enrollmentRequests', 'list', status] as const,
  },

  profiles: {
    // Prefix key — every cached profile page, for a mutation (recording an exam result) that
    // changes what any student's profile page shows.
    detailAll: ['profiles', 'detail'] as const,
    detail: (profileId: string) => ['profiles', 'detail', profileId] as const,
    // Prefix key — invalidating this catches every in-flight search regardless of query text or
    // excludeBatchId, for a mutation (enroll/move) that can change who's addable to any batch.
    searchAll: ['profiles', 'search'] as const,
    search: (query: string, excludeBatchId?: string) =>
      ['profiles', 'search', query, excludeBatchId] as const,
    // Every profile the signed-in *account* holds (app-shell.tsx's profile switcher) — the same
    // GET /profiles the login page's own picker uses, scoped by session rather than by the
    // currently active profile, so it works the same whichever profile is active when it's asked.
    mine: ['profiles', 'mine'] as const,
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

export const coursesQuery = () =>
  queryOptions({
    queryKey: keys.courses,
    queryFn: fetchCourses,
    staleTime: CATALOG_STALE_TIME,
  })

export const courseQuery = (slug: string) =>
  queryOptions({
    queryKey: keys.course(slug),
    queryFn: () => fetchCourse(slug),
    staleTime: CATALOG_STALE_TIME,
    // A slug that isn't a course is a 404, and retrying a 404 just delays saying so.
    retry: false,
  })

export const myCoursesQuery = (profileId: string) =>
  queryOptions({
    queryKey: keys.myCourses(profileId),
    queryFn: fetchMyCourses,
    staleTime: CATALOG_STALE_TIME,
  })

export const examsQuery = () =>
  queryOptions({
    queryKey: keys.exams,
    queryFn: fetchExams,
  })

export const adminSittingsQuery = () =>
  queryOptions({
    queryKey: keys.adminExams,
    queryFn: fetchAdminSittings,
  })

// Both the admin slots panel (no filter) and the student exams screen's "Available sittings"
// (status: 'open') go through this one factory — see `fetchExamSlots`'s own doc comment.
export const examSlotsQuery = (filter?: { trackId?: string; status?: ApiExamSlotStatus }) =>
  queryOptions({
    queryKey: keys.examSlots.list(filter?.trackId, filter?.status),
    queryFn: () => fetchExamSlots(filter),
  })

export const examSlotRequestsQuery = (status: ApiExamSlotRequestStatus) =>
  queryOptions({
    queryKey: keys.examSlotRequests.list(status),
    queryFn: () => fetchExamSlotRequests(status),
  })

export const examEligibilityQuery = () =>
  queryOptions({
    queryKey: keys.examEligibility,
    queryFn: fetchEligibleTrackIds,
  })

export const myExamSlotRequestsQuery = () =>
  queryOptions({
    queryKey: keys.examSlotRequests.mine,
    queryFn: fetchMyExamSlotRequests,
  })

// The admin exams screen's own "Awaiting"/"Graded" lists (components/admin/admin-exams-screen.tsx)
// — a "Load more" button drives `fetchNextPage`, so pages accumulate instead of the screen walking
// every page up front the way `adminSittingsQuery` above still does for the overview's badge count.
export const adminSittingsPageQuery = (graded: boolean, query: string) =>
  infiniteQueryOptions({
    queryKey: keys.adminExamsPage(graded, query),
    queryFn: ({ pageParam }) =>
      fetchAdminSittingsPage({ graded, query: query.trim() || undefined, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
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

// Which batches are joinable changes whenever an admin creates a batch or marks one completed —
// a short staleTime rather than the catalog's 10-minute one keeps a picker that's sat open for a
// while from missing a batch that just appeared or was marked completed.
export const openBatchesQuery = () =>
  queryOptions({
    queryKey: keys.batches.open,
    queryFn: fetchOpenBatches,
    staleTime: 30_000,
  })

// The create-batch form's classifier dropdown — a short, rarely-changing list, so a generous
// staleTime (matching catalogTracksQuery's own reasoning) avoids a refetch every time the form
// opens.
export const batchClassifiersQuery = () =>
  queryOptions({
    queryKey: keys.batches.classifiers,
    queryFn: fetchBatchClassifiers,
    staleTime: CATALOG_STALE_TIME,
  })

export const catalogTracksQuery = () =>
  queryOptions({
    queryKey: keys.catalog.list(),
    queryFn: fetchCatalogTracks,
    staleTime: CATALOG_STALE_TIME,
  })

// app-shell.tsx's profile switcher: who else this account could switch to. A household's set of
// profiles is effectively static within a session (nobody's adding a sibling mid-visit), so this
// shares catalogTracksQuery's own generous staleTime rather than refetching on every dropdown open.
export const myProfilesQuery = () =>
  queryOptions({
    queryKey: keys.profiles.mine,
    queryFn: fetchProfiles,
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

export const enrollmentRequestsQuery = (status: ApiEnrollmentRequestStatus) =>
  queryOptions({
    queryKey: keys.enrollmentRequests.list(status),
    queryFn: () => fetchEnrollmentRequests(status),
  })

export const profileDetailQuery = (profileId: string) =>
  queryOptions({
    queryKey: keys.profiles.detail(profileId),
    queryFn: () => fetchProfileDetail(profileId),
  })

// The admin "add a student" search (components/admin/roster-editor.tsx). Keyed on the query text
// itself, not just the batch — each keystroke is its own cache entry rather than one entry the
// next keystroke overwrites, which is what lets backspacing to an earlier search show its result
// instantly instead of refetching.
export const profileSearchQuery = (query: string, excludeBatchId?: string) =>
  queryOptions({
    queryKey: keys.profiles.search(query, excludeBatchId),
    queryFn: () => searchProfiles(query, excludeBatchId),
    enabled: query.trim().length > 0,
  })

// The command palette's batch/student search (components/command-palette.tsx). No server-side
// `enabled`-by-query-text gate here the way `profileSearchQuery`/the old `globalSearchQuery` had —
// the palette fetches this once (per its own `enabled: open`) and filters the *result* client-side
// on every keystroke, rather than sending a request per keystroke.
export const batchesWithRosterQuery = () =>
  queryOptions({
    queryKey: keys.batches.withRoster,
    queryFn: fetchBatchesWithRoster,
  })
