import { fetchAllPages, fetchApi, mutateApi, notFound } from '@/lib/api/client'
import type { AdminBatchDetail, AdminBatchRow } from '@/lib/models/dashboard'
import { getSelectedProfileId } from '@/lib/auth/profile-store'
import type { ApiBatch, ApiBatchWithRole, ApiEvaluation, ApiProficiencyLevel, ApiTrack } from '@/lib/api/api-types'
import { buildRoster, isRosterStudent } from '@/lib/api/reshape'

// GET /v1/profiles/:profileId/batches?withDetail=true (the signed-in profile — the real gap closed
// in apps/api specifically because this page needed it, see PARITY_PLAN.md).
export type AdminBatchesPayload = {
  active: AdminBatchRow[]
  upcoming: AdminBatchRow[]
  archived: AdminBatchRow[]
  summary: { active: number; total: number; students: number; tracks: number }
}

function toAdminBatchRow(batch: ApiBatchWithRole, trackName: string): AdminBatchRow {
  const staffMember = batch.members.find(m => m.role === 'instructor')
  return {
    id: batch.id,
    code: batch.code,
    track: trackName,
    status: batch.status,
    students: batch.members.filter(m => isRosterStudent(m, batch.status)).length,
    // apps/web's live admin table abbreviates to "R. Venkatesh"; keeping the real full name here
    // rather than replicating that formatting heuristic for a dev-only wiring pass.
    staff: staffMember?.name ?? '—',
    hasSchedule: batch.classSlots.length > 0,
    hasMeetingUrl: batch.meetingUrl !== null,
  }
}

async function fetchAdminBatchesWithTracks(): Promise<{
  items: ApiBatchWithRole[]
  tracksById: Map<string, ApiTrack>
}> {
  const profileId = getSelectedProfileId()
  const [batchesPage, tracks] = await Promise.all([
    fetchApi<{ items: ApiBatchWithRole[] }>(
      `/profiles/${profileId}/batches?withDetail=true&limit=100`,
    ),
    fetchApi<ApiTrack[]>('/tracks'),
  ])

  return { items: batchesPage.items, tracksById: new Map(tracks.map(t => [t.id, t])) }
}

export async function fetchAdminBatches(): Promise<AdminBatchesPayload> {
  const { items, tracksById } = await fetchAdminBatchesWithTracks()
  // Alphabetical by code, numbers compared as numbers (…-2 before …-10).
  const rows = items
    .map(batch => toAdminBatchRow(batch, tracksById.get(batch.trackId)?.name ?? batch.trackId))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }))

  return {
    active: rows.filter(r => r.status === 'active'),
    upcoming: rows.filter(r => r.status === 'upcoming'),
    archived: rows.filter(r => r.status === 'completed'),
    summary: {
      active: rows.filter(r => r.status === 'active').length,
      total: rows.length,
      // Students currently in a seat — not those on a break, dropped or inactive, and not a
      // completed batch's cohort, which the per-batch count above keeps for the record.
      students: items.reduce((n, b) => n + b.members.filter(m => m.role !== 'instructor' && m.status === 'active').length, 0),
      tracks: tracksById.size,
    },
  }
}

// GET /v1/batches/:batchId — looked up by `code` (the admin overview's route param), since the
// bare batch id isn't part of this app's URLs; reuses the same withDetail list rather than a
// separate by-code lookup endpoint (apps/api's GET /batches/:batchId takes a UUID, not a
// code). The roster's per-chapter marks come from GET /batches/:batchId/evaluations — the same
// endpoint the live app's batch-detail page uses — via `buildRoster` (shared with the dashboard's
// teaching panel).
export async function fetchAdminBatch(code: string): Promise<AdminBatchDetail> {
  const { items, tracksById } = await fetchAdminBatchesWithTracks()
  const batch = items.find(b => b.code === code)
  if (!batch) return notFound(`Batch ${code}`)

  const track = tracksById.get(batch.trackId)
  const chapters = track?.chapters ?? []
  const evaluations = await fetchAllPages<ApiEvaluation>(
    cursor => `/batches/${batch.id}/evaluations?limit=100${cursor ? `&cursor=${cursor}` : ''}`,
  )

  const row = toAdminBatchRow(batch, track?.name ?? batch.trackId)
  const orderedChapters = [...chapters].sort((a, b) => a.order - b.order)
  const roster = buildRoster(batch, chapters, evaluations)

  return {
    ...row,
    trackId: batch.trackId,
    startDate: batch.startDate,
    meetingUrl: batch.meetingUrl,
    classSlots: batch.classSlots.map(slot => ({
      day:
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.dayOfWeek] ?? String(slot.dayOfWeek),
      time: slot.time,
      durationMinutes: slot.durationMinutes,
    })),
    // Teachers before TAs, whatever order the members arrived in.
    staffRoster: batch.members
      .filter(
        (m): m is typeof m & { role: 'instructor' | 'ta' } =>
          m.role === 'instructor' || m.role === 'ta',
      )
      .sort((a, b) => Number(a.role === 'ta') - Number(b.role === 'ta'))
      .map(m => ({ name: m.name, role: m.role })),
    chapterCodes: orderedChapters.map(chapter => chapter.code),
    // Parallel to chapterCodes — lets a caller (the mark book's grade editor) resolve which real
    // chapter a grid column stands for, since `RosterStudent.marks[i]` is keyed to this same order.
    chapterIds: orderedChapters.map(chapter => chapter.id),
    chapterTitles: orderedChapters.map(chapter => chapter.title),
    roster,
  }
}

// POST /v1/batches/:batchId/evaluations — a teacher/TA, or (AccessPolicy.requireCanCreateEvaluation)
// a school admin, marks one or more students' levels on one or more chapters, in a single request.
// Evaluations are append-only history (see reshape.ts's `latestLevelByChapterId`): "editing" a
// grade means recording a new one, not mutating an old row — the most recent `evaluatedAt` simply
// becomes the roster's new current mark for that chapter. The server silently drops any item that
// would overwrite an already-certified (exam-graded) L4 chapter — see
// apps/api/src/evaluations/service.ts's `createEvaluations` for why that has to happen there and
// not here.
export type CreateEvaluationInput = {
  studentId: string
  chapterId: string
  level: ApiProficiencyLevel
  notes?: string
}

export async function createEvaluations(
  batchId: string,
  items: CreateEvaluationInput[],
): Promise<ApiEvaluation[]> {
  return mutateApi<ApiEvaluation[]>(`/batches/${batchId}/evaluations`, 'POST', items)
}

// The mark book's own grade dialog only ever grades one cell — a thin wrapper over
// `createEvaluations` rather than a separate endpoint. The server rejects with a 409 if that one
// item lands on an already-certified chapter (see `createEvaluations`'s own doc comment above),
// which surfaces here as a normal `ApiError` for the dialog to show.
export async function createEvaluation(
  batchId: string,
  data: CreateEvaluationInput,
): Promise<ApiEvaluation> {
  const [created] = await createEvaluations(batchId, [data])
  return created!
}

// POST /v1/batches — admin-only. Every batch not marked completed is immediately requestable
// (GET /v1/batches/open), so there's nothing enrollment-related left for this call to configure.
// `classifier`, not `code`: the code is generated server-side
// (`apps/api/src/batches/service.ts::createBatch`) as `<COURSE>-<year>-<CLASSIFIER>-<track
// order>-<index>` — the current calendar year, never client-supplied, and `index`
// auto-increments per (course, year, classifier, track). See `fetchBatchClassifiers` below for
// the classifier dropdown this pairs with.
export type CreateBatchInput = {
  trackId: string
  classifier: string
  // At least one: a batch is never created without a teacher.
  instructorIds: string[]
  startDate?: string | null
  meetingUrl?: string | null
}

export async function createBatch(input: CreateBatchInput): Promise<ApiBatch> {
  return mutateApi<ApiBatch>('/batches', 'POST', input)
}

// GET /v1/batches/classifiers — admin-only. Every classifier already in use in the current
// course's batch codes (e.g. "CH", "TEACH", "REM"), for the create-batch form's dropdown —
// alongside a free-text option to introduce a new one, since this list is only ever a seed, not a
// closed set.
export async function fetchBatchClassifiers(): Promise<string[]> {
  return fetchApi<string[]>('/batches/classifiers')
}
