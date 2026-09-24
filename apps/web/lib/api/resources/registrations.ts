import { fetchAllPages, fetchApi, mutateApi } from '@/lib/api/client'
import type { ApiProficiencyLevel, ApiRegistration, ApiRegistrationStatus } from '@/lib/api/api-types'

// `countryTimeZone` deliberately isn't part of this input — apps/api derives it server-side from
// city/state/country (`utils/timezone.ts::deriveTimeZone`) rather than accepting it directly.
export type SubmitRegistrationInput = {
  firstName: string
  lastName: string
  phone: string
  yearOfBirth: number
  email?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
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
  // The course is the one in the URL (`/vedam/register`): `request()` derives `x-course-slug` from it,
  // so an application can only be filed under the course of the page it was submitted from.
  return mutateApi<ApiRegistration>('/registrations', 'POST', data)
}

// GET /v1/registrations?status=... — admin-only (AccessPolicy.requireCanReviewRegistrations).
export async function fetchRegistrations(
  status: ApiRegistrationStatus,
): Promise<ApiRegistration[]> {
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
