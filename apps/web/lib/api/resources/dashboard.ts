import { fetchApi, notFound } from '@/lib/api/client'
import type { ChapterContent } from '@/lib/models/content'
import type { TeachingBatch } from '@/lib/models/dashboard'
import type { LadderTrack } from '@/components/track-ladder'
import type { ApiChapterDetail, ApiDashboard } from '@/lib/api/api-types'
import { buildChapterContent, buildLearningTracks, buildTeachingBatch, findNextClass, findResumeChapterId, isArchivedTrack } from '@/lib/api/reshape'

// GET /v1/me/dashboard
export type DashboardPayload = {
  firstName: string
  learningTracks: LadderTrack[]
  archivedLearningTracks: LadderTrack[]
  teachingBatches: TeachingBatch[]
  resumeChapterId: string | null
  nextClass: ReturnType<typeof findNextClass>
  upcomingExam: { trackName: string; when: string } | null
  // Whether this profile currently holds a *live* student seat: an 'active' enrollment in a batch
  // that hasn't ended. False both for someone never enrolled anywhere and for someone on a break /
  // whose last batch completed — components/open-batch-picker.tsx is what the dashboard shows
  // instead whenever this is false, in either case.
  hasActiveBatch: boolean
  // Every batch this profile has already asked to join and is still waiting on an admin/instructor
  // to approve — components/open-batch-picker.tsx uses this to show "Pending approval" instead of
  // a "Join" button for those rows.
  pendingBatchIds: string[]
}

export async function fetchStudentDashboard(): Promise<ApiDashboard> {
  return fetchApi<ApiDashboard>('/me/dashboard')
}

export async function fetchDashboard(): Promise<DashboardPayload> {
  const data = await fetchStudentDashboard()

  const ladders = buildLearningTracks(data)
  // See `isArchivedTrack`: finished by the student AND no live seat in a still-running batch.
  const archivedLearningTracks = ladders.filter(isArchivedTrack)
  // The component always treats `learningTracks[0]` as "what to focus on" (its own `resume`
  // lookup and the header both key off it), so this list is sorted for that rather than left in
  // whatever order `tracks` happened to come back in — a running batch first, then furthest
  // along, mirroring apps/web/lib/dashboard-view.ts::sortLearningByFocus.
  const learningTracks = ladders
    .filter(track => !archivedLearningTracks.includes(track))
    .sort(
      (a, b) =>
        Number(b.batchStatus === 'active') - Number(a.batchStatus === 'active') ||
        b.progress - a.progress,
    )

  const trackById = new Map(data.tracks.map(track => [track.id, track]))
  const teachingBatches = data.teaching
    .map(teaching => {
      const membership = data.memberships.find(m => m.id === teaching.batchId)
      const track = membership && trackById.get(membership.trackId)
      if (!membership || !track) return null
      return buildTeachingBatch(membership, track.name, track.chapters, teaching.evaluations)
    })
    .filter((batch): batch is NonNullable<typeof batch> => batch !== null)

  const upcoming = data.upcomingExams[0]

  const hasActiveBatch = data.memberships.some(
    m => m.role === 'student' && m.enrollmentStatus === 'active' && m.status !== 'completed',
  )

  return {
    firstName: data.firstName,
    learningTracks,
    archivedLearningTracks,
    teachingBatches,
    resumeChapterId: learningTracks[0] ? findResumeChapterId(learningTracks[0]) : null,
    nextClass: findNextClass(data.memberships.find(m => m.status === 'active')),
    upcomingExam: upcoming
      ? {
          trackName: upcoming.track.name,
          when: upcoming.scheduledAt,
        }
      : null,
    hasActiveBatch,
    pendingBatchIds: data.pendingBatchIds,
  }
}

// Real title/track/proficiency via the dashboard aggregate (the one place a chapter's track and
// this student's progress on it are already joined) plus a direct GET /v1/chapters/:id for the
// chapter's own scripts/audio — one extra request for one user-initiated chapter open, not the
// list-render fan-out `[[project_batch_n1_incident]]` was about. `ApiChapter` itself (embedded in
// every track on every dashboard load) deliberately stays thin; only this one-chapter call gets
// the heavier `ApiChapterDetail` shape (see `reshape.ts`'s `buildChapterContent`).
export async function fetchChapter(chapterId: string): Promise<ChapterContent> {
  const dashboard = await fetchStudentDashboard()
  // The URL is /chapters/:code, not /tracks/:trackId/chapters/:code — resolve which real chapter
  // (and its UUID, which the detail endpoint actually keys on) that code refers to first.
  const chapter = dashboard.tracks.flatMap(t => t.chapters).find(c => c.code === chapterId)
  if (!chapter) return notFound(`Chapter ${chapterId}`)

  const detail = await fetchApi<ApiChapterDetail>(`/chapters/${chapter.id}`)
  return buildChapterContent(dashboard, chapter, detail)
}

// GET /v1/chapters/:chapterId, raw — for the admin authoring panel, which already has the real
// chapter UUID from `CatalogChapter.id` (`lib/mock-catalog.ts`'s `buildCatalogTrack` reshape reads
// it straight off `ApiChapter.id`) and needs the *authoring* view's full scripts/audio, not the
// student-facing `ChapterContent` shape `fetchChapter` above builds.
export async function fetchChapterDetail(chapterId: string): Promise<ApiChapterDetail> {
  return fetchApi<ApiChapterDetail>(`/chapters/${chapterId}`)
}
