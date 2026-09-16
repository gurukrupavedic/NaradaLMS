import { fetchAllPages, fetchApi, mutateApi, notFound, send } from '@/lib/api/client'
import type { CatalogChapter, CatalogTrack } from '@/lib/mock-catalog'
import { readTrack, readTracks, resetCatalogCache, writeTrack } from '@/lib/api/store'
import type { ChapterContent } from '@/lib/mock-content'
import type { AdminBatchDetail, AdminBatchRow, CertificationRow, SittingRow, TeachingBatch } from '@/lib/mock-dashboard'
import { getSelectedProfileId } from '@/lib/auth/profile-store'
import type { LadderTrack } from '@/components/track-ladder'
import type {
  ApiAudioAsset,
  ApiAuthProfile,
  ApiBatch,
  ApiBatchWithRole,
  ApiChapterDetail,
  ApiDashboard,
  ApiEvaluation,
  ApiOpenBatch,
  ApiProficiencyLevel,
  ApiProfile,
  ApiProfileDetail,
  ApiRegistration,
  ApiRegistrationStatus,
  ApiScriptKey,
  ApiTrack,
} from '@/lib/api/api-types'
import {
  buildCertificationRows,
  buildChapterContent,
  buildLearningTracks,
  buildRoster,
  buildTeachingBatch,
  findNextClass,
  findResumeChapterId,
  narrowLevel,
} from '@/lib/api/reshape'

/**
 * One function per endpoint, named after it. These are the seams: each body is
 * a fixture lookup today and a `fetchApi` call against the documented route
 * tomorrow, with the signature unchanged.
 *
 * `fetchDashboard`/`fetchExams`/`fetchAdminBatches`/`fetchAdminBatch` below now do exactly that —
 * they call the real apps/api as the signed-in profile (see `lib/api/client.ts`'s docstring
 * for how). `fetchCatalogTracks`/`fetchCatalogTrack` also read real data now, through
 * `lib/api/store.ts`'s writable seed (see its own doc comment); `fetchChapter` too, through the
 * same dashboard aggregate `fetchDashboard` uses. The five title/order/status mutations under
 * "── Mutations ──" below remain mocked — those endpoints don't exist in apps/api yet (out of
 * scope per PARITY_PLAN.md §17). Content authoring (under "── Content authoring ──") is different:
 * it has a real endpoint now, so those five write for real — see `lib/api/client.ts`'s doc comment
 * for the resulting mock/real split this creates in the same admin screen.
 */

// GET /v1/profiles — called from app/login/page.tsx after OTP verification, before any profile is
// selected, so unlike every other fetcher here it never sends `X-Profile-Id` (there isn't one yet).
export async function fetchProfiles(): Promise<ApiProfile[]> {
  return fetchApi<ApiProfile[]>('/profiles')
}

// GET /v1/profile (singular) — the signed-in account's own authorization facts, not a business
// profile (see `ApiAuthProfile`'s own doc comment). Backs `useHasAdminAccess`
// (`lib/auth/profile-store.ts`), which gates the admin nav item and screens.
export async function fetchAuthProfile(): Promise<ApiAuthProfile> {
  return fetchApi<ApiAuthProfile>('/profile')
}

// GET /v1/profiles/:profileId/detail — the profile page: full contact/registration detail plus
// the same track/exam-history shape the dashboard already assembles, for any profile the caller is
// allowed to view (self, a teacher sharing a batch with them, or a school admin — enforced server-
// side by `AccessPolicy#requireCanViewProfile`; a caller outside that set gets a 403 `ApiError`).
export async function fetchProfileDetail(profileId: string): Promise<ApiProfileDetail> {
  return fetchApi<ApiProfileDetail>(`/profiles/${profileId}/detail`)
}

// GET /v1/profiles/search — admin-only (AccessPolicy.requireCanSearchProfiles). Backs the "add a
// student" search in components/admin/roster-editor.tsx; `excludeBatchId` filters out profiles
// already on that batch's roster at the query level, so results are always someone actually
// addable.
export async function searchProfiles(query: string, excludeBatchId: string): Promise<ApiProfile[]> {
  const params = new URLSearchParams({ excludeBatchId })
  if (query.trim()) params.set('query', query.trim())
  return fetchApi<ApiProfile[]>(`/profiles/search?${params.toString()}`)
}

// ── Registrations ────────────────────────────────────────────────────────────

export type SubmitRegistrationInput = {
  firstName: string
  lastName: string
  phone: string
  yearOfBirth?: number | null
  email?: string | null
  city?: string | null
  countryTimeZone?: string | null
  learningGoal?: string | null
  currentProficiency?: ApiProficiencyLevel | null
  spokenLanguages?: string[]
  readLanguages?: string[]
  parentNames?: string[]
  dressCodeAgreed?: boolean
  noMeatAgreed?: boolean
  noAlcoholAgreed?: boolean
  noSmokingAgreed?: boolean
  comments?: string | null
}

// POST /v1/registrations — the one call in this file with no signed-in caller. `mutateApi` still
// fits: `getSelectedProfileId()` simply has nothing to return for a visitor who has never signed
// in, so the `X-Profile-Id` header it normally attaches is just omitted, exactly like the
// `fetchProfiles()` call below does for the same reason.
export async function submitRegistration(data: SubmitRegistrationInput): Promise<ApiRegistration> {
  return mutateApi<ApiRegistration>('/registrations', 'POST', data)
}

// GET /v1/registrations?status=... — admin-only (AccessPolicy.requireCanReviewRegistrations).
export async function fetchRegistrations(status: ApiRegistrationStatus): Promise<ApiRegistration[]> {
  return fetchAllPages<ApiRegistration>(
    cursor => `/registrations?status=${status}&limit=100${cursor ? `&cursor=${cursor}` : ''}`,
  )
}

export async function fetchRegistration(id: string): Promise<ApiRegistration> {
  return fetchApi<ApiRegistration>(`/registrations/${id}`)
}

export async function approveRegistration(id: string): Promise<ApiRegistration> {
  return mutateApi<ApiRegistration>(`/registrations/${id}/approve`, 'POST')
}

export async function rejectRegistration(id: string): Promise<ApiRegistration> {
  return mutateApi<ApiRegistration>(`/registrations/${id}/reject`, 'POST')
}

// GET /v1/me/dashboard
export type DashboardPayload = {
  firstName: string
  learningTracks: LadderTrack[]
  archivedLearningTracks: LadderTrack[]
  teachingBatches: TeachingBatch[]
  resumeChapterId: string | null
  nextClass: ReturnType<typeof findNextClass>
  upcomingExam: { chapterCode: string; chapterTitle: string; when: string } | null
  // Whether this profile currently holds a *live* student seat: an 'active' enrollment in a batch
  // that hasn't ended. False both for someone never enrolled anywhere and for someone on a break /
  // whose last batch completed — components/open-batch-picker.tsx is what the dashboard shows
  // instead whenever this is false, in either case.
  hasActiveBatch: boolean
}

async function fetchStudentDashboard(): Promise<ApiDashboard> {
  return fetchApi<ApiDashboard>('/me/dashboard')
}

export async function fetchDashboard(): Promise<DashboardPayload> {
  const data = await fetchStudentDashboard()

  const ladders = buildLearningTracks(data)
  // A track is archived once the student has been through everything in it AND isn't sitting in
  // a still-running batch for it — matches apps/web/lib/dashboard-view.ts::isLiveTrack +
  // hasUnfinishedWork: `status: 'completed'` means the cohort's run ended, not that the student
  // finished the material, so a track only archives once both are true.
  const archivedLearningTracks = ladders.filter(
    track => track.started >= track.total && track.batchStatus !== 'active' && track.batchStatus !== 'upcoming',
  )
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
      ? { chapterCode: upcoming.chapter.code, chapterTitle: upcoming.chapter.title, when: upcoming.scheduledAt }
      : null,
    hasActiveBatch,
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

// GET /v1/exams (scheduled/past sittings) + the certification record, from the dashboard's own
// `certifications` (packages/db's dedicated `trackCertification` table — decoupled from `chapter`
// as of the real-data fix; there is no separate certifications endpoint).
export type ExamsPayload = {
  certifications: CertificationRow[]
  scheduled: SittingRow[]
  past: SittingRow[]
}

function toSittingRow(exam: {
  id: string
  scheduledAt: string
  chapter: { code: string; title: string; trackId: string }
  evaluation: { level: ApiEvaluation['level']; notes: string | null } | null
}, trackNameById: Map<string, string>): SittingRow {
  return {
    id: exam.id,
    chapterCode: exam.chapter.code,
    chapterTitle: exam.chapter.title,
    track: trackNameById.get(exam.chapter.trackId) ?? exam.chapter.trackId,
    when: exam.scheduledAt,
    level: exam.evaluation ? narrowLevel(exam.evaluation.level) : null,
    notes: exam.evaluation?.notes ?? null,
  }
}

export async function fetchExams(): Promise<ExamsPayload> {
  const [dashboard, examList] = await Promise.all([
    fetchStudentDashboard(),
    fetchApi<{ items: Parameters<typeof toSittingRow>[0][] }>('/exams'),
  ])

  const trackNameById = new Map(dashboard.tracks.map(track => [track.id, track.name]))
  const certifications = buildCertificationRows(dashboard)
  const sittings = examList.items.map(exam => toSittingRow(exam, trackNameById))
  return {
    certifications,
    scheduled: sittings.filter(s => !s.level),
    past: sittings.filter(s => s.level),
  }
}

// GET /v1/profiles/:profileId/batches?withDetail=true (the signed-in profile — the real gap closed
// in apps/api specifically because this page needed it, see PARITY_PLAN.md).
export type AdminBatchesPayload = {
  active: AdminBatchRow[]
  upcoming: AdminBatchRow[]
  archived: AdminBatchRow[]
  summary: { active: number; total: number; students: number; tracks: number }
}

// Shared with components/admin/batch-detail.tsx's "Enrollment" section — one definition of "open"
// (mirrors apps/api's own apps/api/src/enrollment/service.ts::selfEnroll and
// apps/api/src/batches/repository.ts::findOpen) rather than three copies that could drift.
// `enrollmentClosesAt: null` means open-ended (no scheduled close), not closed.
export function isBatchOpenForEnrollment(batch: {
  enrollmentOpensAt: string | null
  enrollmentClosesAt: string | null
}): boolean {
  if (batch.enrollmentOpensAt === null) return false
  const now = Date.now()
  return (
    new Date(batch.enrollmentOpensAt).getTime() <= now &&
    (batch.enrollmentClosesAt === null || now <= new Date(batch.enrollmentClosesAt).getTime())
  )
}

function toAdminBatchRow(batch: ApiBatchWithRole, trackName: string): AdminBatchRow {
  const staffMember = batch.members.find(m => m.role === 'instructor')
  return {
    id: batch.id,
    code: batch.code,
    track: trackName,
    status: batch.status,
    students: batch.members.filter(m => m.role === 'student').length,
    // apps/web's live admin table abbreviates to "R. Venkatesh"; keeping the real full name here
    // rather than replicating that formatting heuristic for a dev-only wiring pass.
    staff: staffMember?.name ?? '—',
    hasSchedule: batch.classSlots.length > 0,
    hasMeetingUrl: batch.meetingUrl !== null,
    isOpenForEnrollment: isBatchOpenForEnrollment(batch),
  }
}

async function fetchAdminBatchesWithTracks(): Promise<{ items: ApiBatchWithRole[]; tracksById: Map<string, ApiTrack> }> {
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
  const rows = items.map(batch => toAdminBatchRow(batch, tracksById.get(batch.trackId)?.name ?? batch.trackId))

  return {
    active: rows.filter(r => r.status === 'active'),
    upcoming: rows.filter(r => r.status === 'upcoming'),
    archived: rows.filter(r => r.status === 'completed'),
    summary: {
      active: rows.filter(r => r.status === 'active').length,
      total: rows.length,
      students: rows.reduce((n, r) => n + r.students, 0),
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
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.dayOfWeek] ?? String(slot.dayOfWeek),
      time: slot.time,
      durationMinutes: slot.durationMinutes,
    })),
    staffRoster: batch.members
      .filter((m): m is typeof m & { role: 'instructor' | 'ta' } => m.role === 'instructor' || m.role === 'ta')
      .map(m => ({ name: m.name, role: m.role })),
    chapterCodes: orderedChapters.map(chapter => chapter.code),
    // Parallel to chapterCodes — lets a caller (the mark book's grade editor) resolve which real
    // chapter a grid column stands for, since `RosterStudent.marks[i]` is keyed to this same order.
    chapterIds: orderedChapters.map(chapter => chapter.id),
    chapterTitles: orderedChapters.map(chapter => chapter.title),
    roster,
    enrollmentOpensAt: batch.enrollmentOpensAt,
    enrollmentClosesAt: batch.enrollmentClosesAt,
    capacity: batch.capacity,
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
export async function createEvaluation(batchId: string, data: CreateEvaluationInput): Promise<ApiEvaluation> {
  const [created] = await createEvaluations(batchId, [data])
  return created!
}

// ── Open enrollment (student self-service) ──────────────────────────────────

// GET /v1/batches/open — every batch currently open for self-enrollment, any track. Not scoped by
// the caller's own existing enrollments (unlike GET /batches's default `enrolled` scope) — this is
// "what can I join," a different question from "what am I already in."
export async function fetchOpenBatches(): Promise<ApiOpenBatch[]> {
  return fetchApi<ApiOpenBatch[]>('/batches/open')
}

// POST /v1/batches/:batchId/enroll — self-enrolls the signed-in profile as a student. The server
// enforces the open-window/capacity/duplicate checks; a rejection surfaces as an ApiError the
// caller renders directly (409 "batch is full", "already enrolled in this batch", etc.).
export async function selfEnrollInBatch(batchId: string): Promise<void> {
  await mutateApi(`/batches/${batchId}/enroll`, 'POST')
}

// POST /v1/batches/:batchId/members — admin (or an instructor/ta of this batch) adding an
// arbitrary profile to its roster. Distinct from `selfEnrollInBatch` above: no open-enrollment
// window or capacity check gates this, since the caller's own batch permission *is* the
// authorization (AccessPolicy.requireCanCreateEnrollment).
export async function enrollProfile(
  batchId: string,
  profileId: string,
  role: 'student' | 'ta' | 'instructor',
): Promise<void> {
  await mutateApi(`/batches/${batchId}/members`, 'POST', { profileId, role })
}

// POST /v1/batches/:batchId/members/:profileId/move — moves a profile already on this roster to a
// different batch, preserving their role, in one atomic step server-side (apps/api/src/enrollment/
// service.ts::moveEnrollment) rather than an unenroll-then-enroll pair that could leave neither
// roster if the second call failed.
export async function moveEnrollmentToBatch(
  fromBatchId: string,
  profileId: string,
  toBatchId: string,
): Promise<void> {
  await mutateApi(`/batches/${fromBatchId}/members/${profileId}/move`, 'POST', { toBatchId })
}

// POST /v1/batches/:batchId/enrollment/open — admin-only. Opens the batch for self-enrollment
// right now, with no scheduled close. The one-click replacement for hand-picking an opens-at/
// closes-at timestamp pair (components/admin/batch-detail.tsx's "Enrollment" section).
export async function openBatchEnrollment(batchId: string): Promise<void> {
  await mutateApi(`/batches/${batchId}/enrollment/open`, 'POST')
}

// POST /v1/batches/:batchId/enrollment/close — admin-only.
export async function closeBatchEnrollment(batchId: string): Promise<void> {
  await mutateApi(`/batches/${batchId}/enrollment/close`, 'POST')
}

// POST /v1/batches — admin-only. `openForEnrollmentNow` is this form's own convenience, not a
// real column: checked, it sends the current instant as `enrollmentOpensAt` with no
// `enrollmentClosesAt` (open-ended, same shape `openBatchEnrollment` produces on an existing
// batch); unchecked, it sends neither, leaving the new batch closed the way every batch was
// before this form existed. No `capacity` field — every batch gets the server's own
// `DEFAULT_BATCH_CAPACITY` (apps/api/src/batches/schema.ts) since there's no admin-facing way to
// set it per batch today.
export type CreateBatchInput = {
  trackId: string
  code: string
  startDate?: string | null
  meetingUrl?: string | null
  openForEnrollmentNow: boolean
}

export async function createBatch(input: CreateBatchInput): Promise<ApiBatch> {
  const { openForEnrollmentNow, ...rest } = input
  return mutateApi<ApiBatch>('/batches', 'POST', {
    ...rest,
    enrollmentOpensAt: openForEnrollmentNow ? new Date().toISOString() : null,
    enrollmentClosesAt: null,
  })
}

// GET /v1/tracks — admin view, drafts included. Reads through the store (lib/api/store.ts), which
// seeds itself from this same real endpoint on first call and reflects edits made this session
// from then on — see that module's own doc comment for why.
export function fetchCatalogTracks(): Promise<CatalogTrack[]> {
  return readTracks()
}

// GET /v1/tracks/:trackId — admin view, drafts included.
export async function fetchCatalogTrack(trackId: string): Promise<CatalogTrack> {
  const track = await readTrack(trackId)
  return track ? track : notFound(`Track ${trackId}`)
}

// ── Mutations ───────────────────────────────────────────────────────────────
// Named for the endpoint each one stands in for. `saveTrack` (name/subtitle — `subtitle` has no
// real column, see `store.ts`'s doc comment) is still mocked via `send()` + the local store; the
// four chapter mutations below are real (`chapters/route.ts`'s `POST /`, `PATCH /:chapterId`, and
// `tracks/route.ts`'s `PUT /:trackId/chapters/order` — real gaps closed 2026-09-09). They resolve
// to void: the optimistic cache write in `use-catalog-mutations.ts` already holds the new state,
// so the only thing the caller needs back is whether it failed.

// `isCertification` has no real column (see `store.ts`'s doc comment) — a real PATCH wouldn't know
// what to do with it, so only the fields the real schema understands are forwarded; anything else
// in `patch` (isCertification, other `content` fields beyond `script`) is silently dropped rather
// than sent.
export async function saveChapter(id: string, patch: Partial<CatalogChapter>): Promise<void> {
  const body: { code?: string; title?: string; status?: 'draft' | 'published'; script?: ApiScriptKey | null } = {}
  if (patch.code !== undefined) body.code = patch.code
  if (patch.title !== undefined) body.title = patch.title
  if (patch.status !== undefined) body.status = patch.status
  if (patch.content !== undefined) body.script = patch.content.script

  // A patch touching only `isCertification` has nothing real to send (the schema requires at
  // least one recognized field) — the optimistic cache write already applied it locally, and
  // that's genuinely all this field gets today; skip the round trip rather than send an empty
  // body the server would reject.
  if (Object.keys(body).length === 0) return

  await mutateApi(`/chapters/${id}`, 'PATCH', body)
  resetCatalogCache()
}

export async function saveChapterOrder(trackId: string, orderedIds: string[]): Promise<void> {
  await mutateApi(`/tracks/${trackId}/chapters/order`, 'PUT', { chapterIds: orderedIds })
  resetCatalogCache()
}

export async function createChapter(trackId: string, chapter: CatalogChapter): Promise<void> {
  await mutateApi('/chapters', 'POST', { trackId, code: chapter.code, title: chapter.title })
  resetCatalogCache()
}

// "Delete" archives rather than removes the row — a chapter that ever had student activity can't
// be hard-deleted (real `evaluation`/`exam` rows reference it). `archived` is a real column,
// distinct from `status`; the chapter drops out of every catalog list once this settles and the
// cache resets, but — unlike the old mocked behaviour — not before, since there's no local array
// to splice out of anymore.
export async function deleteChapter(id: string): Promise<void> {
  await mutateApi(`/chapters/${id}`, 'PATCH', { status: 'draft', archived: true })
  resetCatalogCache()
}

export async function saveTrack(
  trackId: string,
  patch: Partial<Pick<CatalogTrack, 'name' | 'subtitle'>>,
): Promise<void> {
  await send('PATCH', `/tracks/${trackId}`, patch)
  writeTrack(trackId, patch)
}

// ── Content authoring ──────────────────────────────────────────────────────
// Real writes against apps/api's chapters domain — unlike every mutation above, these have a
// real endpoint to reach (`chapters/route.ts`), so they go through `mutateApi`, not the mocked
// `send`. See `lib/api/client.ts`'s own doc comment for why the split exists.

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
  return mutateApi<ApiAudioAsset>(`/chapters/${chapterId}/audio/${audioId}/mappings`, 'PUT', { mappings })
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
