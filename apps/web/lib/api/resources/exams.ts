import { fetchAllPages, fetchApi, mutateApi } from '@/lib/api/client'
import type { CertificationRow, SittingRow } from '@/lib/models/dashboard'
import type { ExamMarkKey } from '@/lib/exam-grading'
import type { ApiExam, ApiExamResult } from '@/lib/api/api-types'
import { buildCertificationRows } from '@/lib/api/reshape'
import { fetchStudentDashboard } from './dashboard'

// GET /v1/exams (booked/graded sittings) + the certification record, from the dashboard's own
// `examResults` — a track's certification is its latest graded sitting (packages/db's `examResult`),
// so there is no separate certifications endpoint.
export type ExamsPayload = {
  certifications: CertificationRow[]
  scheduled: SittingRow[]
  past: SittingRow[]
}

function toSittingRow(exam: ApiExam): SittingRow {
  return { id: exam.id, track: exam.track.name, when: exam.scheduledAt, result: exam.result }
}

export async function fetchExams(): Promise<ExamsPayload> {
  const [dashboard, examList] = await Promise.all([
    fetchStudentDashboard(),
    // `mine=true` pins this to strictly the caller's own sittings (AccessPolicy.getOwnExamScope) —
    // without it, a profile who's also a TA/instructor somewhere gets every student's sittings in
    // batches they teach folded into what this screen presents as their own history.
    fetchApi<{ items: ApiExam[] }>('/exams?mine=true'),
  ])

  const certifications = buildCertificationRows(dashboard)
  return {
    certifications,
    // A cancelled sitting is neither booked nor graded, so it belongs to neither list.
    scheduled: examList.items
      .filter(exam => exam.status === 'scheduled' || exam.status === 'inProgress')
      .map(toSittingRow),
    past: examList.items.filter(exam => exam.result !== null).map(toSittingRow),
  }
}

export type AdminSittingRow = {
  id: string
  studentId: string
  studentName: string
  batchCode: string
  track: string
  when: string
  status: ApiExam['status']
  result: ApiExamResult | null
}

export type AdminSittingsPayload = {
  // Booked or under way, oldest first — the ones still owed a result.
  awaiting: AdminSittingRow[]
  // Graded, newest first.
  graded: AdminSittingRow[]
}

function toAdminSittingRow(exam: ApiExam): AdminSittingRow {
  return {
    id: exam.id,
    studentId: exam.studentId,
    studentName: exam.student.name,
    batchCode: exam.batch.code,
    track: exam.track.name,
    when: exam.scheduledAt,
    status: exam.status,
    result: exam.result,
  }
}

// GET /v1/exams, school-wide — `AccessPolicy#getExamVisibility` only returns every student's
// sitting to a school admin who supplies no profile (see `fetchApi`'s `schoolWide`). Used only for
// the admin overview's "N awaiting a result" badge (components/admin/admin-overview.tsx) — the
// grading screen itself (`fetchAdminSittingsPage` below) paginates instead of walking every page.
export async function fetchAdminSittings(): Promise<AdminSittingsPayload> {
  const exams = await fetchAllPages<ApiExam>(
    cursor => `/exams?limit=100${cursor ? `&cursor=${cursor}` : ''}`,
    { schoolWide: true },
  )

  const rows = exams.filter(exam => exam.status !== 'cancelled').map(toAdminSittingRow)

  return {
    awaiting: rows.filter(row => row.result === null),
    graded: rows
      .filter(row => row.result !== null)
      .sort((a, b) => b.result!.evaluatedAt.localeCompare(a.result!.evaluatedAt)),
  }
}

export type AdminSittingsPage = { items: AdminSittingRow[]; nextCursor: string | null }

// One page of GET /v1/exams for the admin exams screen itself (components/admin/admin-exams-screen.tsx),
// which paginates with a "Load more" button instead of walking every page up front. `graded` picks
// the awaiting/graded split server-side (and, for `graded: true`, newest-graded-first — see
// apps/api's `FindExamsSchema`); `query` matches the sitting's student by name.
export async function fetchAdminSittingsPage({
  graded,
  query,
  cursor,
  limit = 20,
}: {
  graded: boolean
  query?: string
  cursor?: string | null
  limit?: number
}): Promise<AdminSittingsPage> {
  const params = new URLSearchParams({
    limit: String(limit),
    graded: String(graded),
    sort: graded ? 'desc' : 'asc',
  })
  if (query) params.set('query', query)
  if (cursor) params.set('cursor', cursor)

  const page = await fetchApi<{ items: ApiExam[]; nextCursor: string | null }>(
    `/exams?${params}`,
    { schoolWide: true },
  )

  return { items: page.items.map(toAdminSittingRow), nextCursor: page.nextCursor }
}

// What an evaluator enters — the five marks and an optional note. The children's bonus, total and
// outcome are derived by the API (and anything sent for them is ignored), so they aren't here.
export type RecordExamResultInput = Record<ExamMarkKey, number> & { notes?: string }

// POST /v1/exams/:examId/results — school admin only. Completes the sitting and, when the outcome
// grants a level, writes it to every chapter of the track.
export async function recordExamResult(
  examId: string,
  input: RecordExamResultInput,
): Promise<ApiExam> {
  return mutateApi<ApiExam>(`/exams/${examId}/results`, 'POST', input)
}

// PATCH /v1/exams/:examId/results — school admin only. Overwrites an already-recorded result (a
// data-entry mistake, not a second sitting) — same input shape and the same chapter-rewrite
// behavior as the POST above, just against a sitting that already has one.
export async function correctExamResult(
  examId: string,
  input: RecordExamResultInput,
): Promise<ApiExam> {
  return mutateApi<ApiExam>(`/exams/${examId}/results`, 'PATCH', input)
}

// A slot is opened by a school admin, and a student's request against it (below) is what
// eventually produces a real `ApiExam` — see apps/api/src/examSlots's own doc comments for the
// full lifecycle. Both list fetchers walk every page (`fetchAllPages`) rather than paginating with
// a "Load more" button, the same choice `fetchEnrollmentRequests` already made: certification
// sittings are inherently low-volume, so there's never enough of either to make walking the whole
// list expensive.
