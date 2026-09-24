import { fetchAllPages, mutateApi } from '@/lib/api/client'
import type { ApiExamSlot, ApiExamSlotRequest, ApiExamSlotRequestStatus, ApiExamSlotRequestWithDetail, ApiExamSlotStatus, ApiExamSlotWithDetail } from '@/lib/api/api-types'

export type ExamSlotRow = {
  id: string
  trackId: string
  track: string
  when: string
  status: ApiExamSlotStatus
}

function toExamSlotRow(slot: ApiExamSlotWithDetail): ExamSlotRow {
  return { id: slot.id, trackId: slot.trackId, track: slot.trackName, when: slot.scheduledAt, status: slot.status }
}

// GET /v1/exam-slots — no access check server-side (a slot carries no personal data), so this is
// used both by the admin slots panel (every status) and the student exams screen (status: 'open'
// only, to browse what can be requested).
export async function fetchExamSlots(filter?: { trackId?: string; status?: ApiExamSlotStatus }): Promise<ExamSlotRow[]> {
  const params = new URLSearchParams({ limit: '100' })
  if (filter?.trackId) params.set('trackId', filter.trackId)
  if (filter?.status) params.set('status', filter.status)

  const slots = await fetchAllPages<ApiExamSlotWithDetail>(
    cursor => `/exam-slots?${params}${cursor ? `&cursor=${cursor}` : ''}`,
  )
  return slots.map(toExamSlotRow)
}

export async function openExamSlot(input: { trackId: string; scheduledAt: string }): Promise<ApiExamSlot> {
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
// profile is always the student, never something this takes as an argument.
export async function requestExamSlot(slotId: string): Promise<ApiExamSlotRequest> {
  return mutateApi<ApiExamSlotRequest>(`/exam-slots/${slotId}/requests`, 'POST')
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
