import { fetchApi, fetchAllPages, mutateApi } from '@/lib/api/client'
import type { ApiExamSchedule, ApiExamScheduleInput, ApiUpdateExamScheduleResult, ApiExamSlot, ApiExamSlotRequest, ApiExamSlotRequestStatus, ApiExamSlotRequestWithDetail, ApiExamSlotStatus } from '@/lib/api/api-types'

export type ExamSlotRow = {
  id: string
  when: string
  status: ApiExamSlotStatus
  recurring: boolean
}

function toExamSlotRow(slot: ApiExamSlot): ExamSlotRow {
  return { id: slot.id, when: slot.scheduledAt, status: slot.status, recurring: slot.scheduleId !== null }
}

// GET /v1/exam-slots — no access check server-side (a slot carries no personal data), so this is
// used both by the admin slots panel (every status) and the student exams screen (status: 'open'
// only, to browse what can be requested).
export async function fetchExamSlots(filter?: { status?: ApiExamSlotStatus }): Promise<ExamSlotRow[]> {
  const params = new URLSearchParams({ limit: '100' })
  if (filter?.status) params.set('status', filter.status)

  const slots = await fetchAllPages<ApiExamSlot>(
    cursor => `/exam-slots?${params}${cursor ? `&cursor=${cursor}` : ''}`,
  )
  return slots.map(toExamSlotRow)
}

// GET /v1/exam-slots/eligibility — the tracks the signed-in profile may request a sitting on right
// now (L3+ on every chapter, the same rule the server enforces when they actually request one).
// Only a pre-check so the button can be disabled up front; the server stays the source of truth.
export async function fetchEligibleTrackIds(): Promise<string[]> {
  return fetchApi<string[]>('/exam-slots/eligibility')
}

export async function openExamSlot(input: { scheduledAt: string }): Promise<ApiExamSlot> {
  return mutateApi<ApiExamSlot>('/exam-slots', 'POST', input)
}

export async function cancelExamSlot(slotId: string): Promise<ApiExamSlot> {
  return mutateApi<ApiExamSlot>(`/exam-slots/${slotId}/cancel`, 'POST')
}

export type ExamSlotRequestRow = {
  id: string
  slotId: string
  trackId: string
  track: string
  studentName: string
  when: string
  status: ApiExamSlotRequestStatus
  createdAt: string
}

function toExamSlotRequestRow(request: ApiExamSlotRequestWithDetail): ExamSlotRequestRow {
  return {
    id: request.id,
    slotId: request.slotId,
    trackId: request.trackId,
    track: request.trackName,
    studentName: request.studentName,
    when: request.slotScheduledAt,
    status: request.status,
    createdAt: request.createdAt,
  }
}

// POST /v1/exam-slots/:slotId/requests — a student claiming a slot for themselves; the caller's own
// profile is always the student, never something this takes as an argument. `trackId` is the track
// they're sitting — the slot itself is generic.
export async function requestExamSlot(input: { slotId: string; trackId: string }): Promise<ApiExamSlotRequest> {
  return mutateApi<ApiExamSlotRequest>(`/exam-slots/${input.slotId}/requests`, 'POST', { trackId: input.trackId })
}

// GET /v1/exam-slots/requests, school-wide — the admin review queue
// (components/admin/exam-slot-request-review.tsx), same `schoolWide` reasoning as
// `fetchAdminSittingsPage`.
export async function fetchExamSlotRequests(status: ApiExamSlotRequestStatus): Promise<ExamSlotRequestRow[]> {
  const requests = await fetchAllPages<ApiExamSlotRequestWithDetail>(
    cursor => `/exam-slots/requests?status=${status}&limit=100${cursor ? `&cursor=${cursor}` : ''}`,
    { schoolWide: true },
  )
  return requests.map(toExamSlotRequestRow)
}

// GET /v1/exam-slots/requests, as the signed-in profile — the API scopes this to strictly the
// caller's own requests the moment a profile is supplied (no `mine` flag needed, unlike
// `fetchExams`: an exam-slot request has no batch-manageable widening for a TA/instructor to fall
// into in the first place). Backs the student exams screen's "My requests" section.
export async function fetchMyExamSlotRequests(): Promise<ExamSlotRequestRow[]> {
  const requests = await fetchAllPages<ApiExamSlotRequestWithDetail>(
    cursor => `/exam-slots/requests?limit=100${cursor ? `&cursor=${cursor}` : ''}`,
  )
  return requests.map(toExamSlotRequestRow)
}

export async function approveExamSlotRequest(id: string): Promise<ApiExamSlotRequest> {
  return mutateApi<ApiExamSlotRequest>(`/exam-slots/requests/${id}/approve`, 'POST')
}

export async function rejectExamSlotRequest(id: string): Promise<ApiExamSlotRequest> {
  return mutateApi<ApiExamSlotRequest>(`/exam-slots/requests/${id}/reject`, 'POST')
}

// Recurring schedules — admin-only on the server. Each rule generates open slots over a rolling
// window; see apps/api/src/examSchedules.
export async function fetchExamSchedules(): Promise<ApiExamSchedule[]> {
  return fetchApi<ApiExamSchedule[]>('/exam-schedules')
}

export async function createExamSchedule(input: ApiExamScheduleInput): Promise<ApiExamSchedule> {
  return mutateApi<ApiExamSchedule>('/exam-schedules', 'POST', input)
}

export async function updateExamSchedule(input: { id: string; data: ApiExamScheduleInput }): Promise<ApiUpdateExamScheduleResult> {
  return mutateApi<ApiUpdateExamScheduleResult>(`/exam-schedules/${input.id}`, 'PUT', input.data)
}

export async function deleteExamSchedule(id: string): Promise<void> {
  return mutateApi<void>(`/exam-schedules/${id}`, 'DELETE')
}
