import 'server-only'

import { cookies } from 'next/headers'

import { fetchApi } from '@/lib/api'
import { fetchAllPages } from '@/lib/api/pagination'
import { PROFILE_COOKIE } from '@/lib/constants'
import type { ApiBatch, ApiBatchDetail, ApiBatchWithRole, ApiPage, BatchStatus, EnrollmentRole } from '@/lib/types'

export async function getBatches(params?: {
  status?: BatchStatus
  cursor?: string
  limit?: number
}): Promise<ApiPage<ApiBatch>> {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.cursor) query.set('cursor', params.cursor)
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return fetchApi<ApiPage<ApiBatch>>(`/batches${qs ? `?${qs}` : ''}`)
}

export async function getBatch(batchId: string): Promise<ApiBatchDetail> {
  return fetchApi<ApiBatchDetail>(`/batches/${batchId}`)
}

// Batches a given profile is/was enrolled in. The API only grants this beyond the profile's own
// batches to instructors/tas who've shared a batch with that profile, or school-wide admins.
export async function getBatchesForProfile(
  profileId: string,
  params?: { status?: BatchStatus; cursor?: string; limit?: number },
): Promise<ApiPage<ApiBatch>> {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.cursor) query.set('cursor', params.cursor)
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return fetchApi<ApiPage<ApiBatch>>(`/profiles/${profileId}/batches${qs ? `?${qs}` : ''}`)
}

export type BatchMembership = {
  batch: ApiBatchDetail
  // null for a batch a school-wide admin/owner can see but has no personal enrollment in — the
  // caller decides whether/how to surface those; they should NOT be treated as "this profile
  // teaches this batch" (see getDashboardData, which fetches evaluations and cross-batch student
  // history per teaching membership — doing that for every school batch on an admin's dashboard
  // is what fans out into hundreds of concurrent requests and exhausts the DB connection pool).
  role: EnrollmentRole | null
}

async function getMyBatchesWithRole(
  profileId: string,
  params?: { cursor?: string },
): Promise<ApiPage<ApiBatchWithRole>> {
  const query = new URLSearchParams({ withDetail: 'true' })
  if (params?.cursor) query.set('cursor', params.cursor)
  return fetchApi<ApiPage<ApiBatchWithRole>>(`/profiles/${profileId}/batches?${query.toString()}`)
}

// The server already resolves the correct batch set for this profile — its own enrollments, or
// every school batch for an admin/owner — and annotates each one with the profile's role in it,
// in a single query.
export async function getMyBatchMemberships(): Promise<BatchMembership[]> {
  const cookieStore = await cookies()
  const profileId = cookieStore.get(PROFILE_COOKIE)?.value
  if (!profileId) return []

  const batches = await fetchAllPages(cursor => getMyBatchesWithRole(profileId, { cursor }))
  return batches.map(({ role, ...batch }) => ({ batch, role }))
}
