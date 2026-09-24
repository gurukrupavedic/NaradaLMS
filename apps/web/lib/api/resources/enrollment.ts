import { fetchAllPages, fetchApi, mutateApi } from '@/lib/api/client'
import type { ApiCourse, ApiEnrollmentRequest, ApiEnrollmentRequestStatus, ApiOpenBatch } from '@/lib/api/api-types'

// GET /v1/courses — school-scoped, no session needed. Every course in the school: names and slugs
// aren't secret (each has its own public registration link), and the registration page needs them
// before there is an account. Not affected by the selected course.
export async function fetchCourses(): Promise<ApiCourse[]> {
  const { items } = await fetchApi<{ items: ApiCourse[] }>('/courses')
  return items
}

// GET /v1/courses/:slug — one course, for the course in the URL (`/vedam/register`, and every page
// under `/vedam/`). 404s for a slug that isn't a course.
export async function fetchCourse(slug: string): Promise<ApiCourse> {
  return fetchApi<ApiCourse>(`/courses/${encodeURIComponent(slug)}`)
}

// GET /v1/me/courses — what the course dropdown lists: every course for an admin, otherwise only
// the ones the signed-in profile is part of (an enrollment in any status, or the registration that
// created it).
export async function fetchMyCourses(): Promise<ApiCourse[]> {
  const { items } = await fetchApi<{ items: ApiCourse[] }>('/me/courses')
  return items
}

// GET /v1/batches/open — every batch a student can request to join: any batch not yet marked
// completed, any track. Not scoped by the caller's own existing enrollments (unlike GET /batches's
// default `enrolled` scope) — this is "what can I ask to join," a different question from "what am
// I already in."
export async function fetchOpenBatches(): Promise<ApiOpenBatch[]> {
  return fetchApi<ApiOpenBatch[]>('/batches/open')
}

// POST /v1/batches/:batchId/enroll — files a pending request to join, for the signed-in profile
// as a student; an admin/instructor must approve it (apps/api/src/enrollmentRequests) before the
// student is actually seated. The server enforces the duplicate-request/already-enrolled checks; a
// rejection surfaces as an ApiError the caller renders directly (409 "already enrolled in this
// batch", 409 "a request to join this batch is already pending", etc.).
export async function requestBatchEnrollment(batchId: string): Promise<ApiEnrollmentRequest> {
  return mutateApi<ApiEnrollmentRequest>(`/batches/${batchId}/enroll`, 'POST')
}

// GET /v1/enrollment-requests?status=... — admin/instructor review queue for batch-join requests
// (components/admin/registration-review.tsx's sibling: same "same place as pending registrations"
// screen, a different underlying resource). Scoped server-side to batches the caller manages
// (AccessPolicy.getEnrollmentRequestVisibility) unless they're a school admin.
export async function fetchEnrollmentRequests(
  status: ApiEnrollmentRequestStatus,
): Promise<ApiEnrollmentRequest[]> {
  return fetchAllPages<ApiEnrollmentRequest>(
    cursor => `/enrollment-requests?status=${status}&limit=100${cursor ? `&cursor=${cursor}` : ''}`,
  )
}

export async function approveEnrollmentRequest(id: string): Promise<ApiEnrollmentRequest> {
  return mutateApi<ApiEnrollmentRequest>(`/enrollment-requests/${id}/approve`, 'POST')
}

export async function rejectEnrollmentRequest(id: string): Promise<ApiEnrollmentRequest> {
  return mutateApi<ApiEnrollmentRequest>(`/enrollment-requests/${id}/reject`, 'POST')
}

// POST /v1/batches/:batchId/members — admin (or an instructor/ta of this batch) adding an
// arbitrary profile to its roster directly. Distinct from `requestBatchEnrollment` above: no
// approval step gates this, since the caller's own batch permission *is* the authorization
// (AccessPolicy.requireCanCreateEnrollment). If the profile already has a non-active (e.g. on a
// break) enrollment row in this batch, the server reactivates it in place rather than conflicting
// (apps/api/src/enrollment/service.ts::enroll) — searchProfiles below already surfaces such a
// profile as a normal, addable candidate for exactly this reason.
export async function enrollProfile(
  batchId: string,
  profileId: string,
  role: 'student' | 'ta' | 'instructor',
): Promise<void> {
  await mutateApi(`/batches/${batchId}/members`, 'POST', { profileId, role })
}

// POST /v1/batches/:batchId/members/:profileId/break — the mark book's "Mark on break" row action
// (components/mark-book.tsx). Server-side (apps/api/src/enrollment/service.ts::putOnBreak) this
// flips the enrollment's status to 'break' rather than deleting it — the seat frees up and the
// student drops off `buildRoster`'s output (reshape.ts), but their record and evaluation history
// survive.
export async function putStudentOnBreak(batchId: string, profileId: string): Promise<void> {
  await mutateApi(`/batches/${batchId}/members/${profileId}/break`, 'POST')
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
