import 'server-only'

import { cookies } from 'next/headers'

import { fetchApi } from '@/lib/api'
import { fetchAllPages } from '@/lib/api/pagination'
import { PROFILE_COOKIE } from '@/lib/constants'
import type { ApiBatch, ApiBatchDetail, ApiPage, BatchStatus, EnrollmentRole } from '@/lib/types'

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
  role: EnrollmentRole
}

// The list response omits members, so resolving the current profile's role requires each batch's
// detail. Keep the detail in the result so callers do not need to fetch teaching batches twice.
export async function getMyBatchMemberships(): Promise<BatchMembership[]> {
  const cookieStore = await cookies()
  const profileId = cookieStore.get(PROFILE_COOKIE)?.value
  if (!profileId) return []

  const batches = await fetchAllPages(cursor => getBatches({ cursor }))
  const details = await Promise.all(batches.map(batch => getBatch(batch.id)))

  return details.flatMap(detail => {
    const membership = detail.members.find(member => member.profileId === profileId)
    if (!membership) return []
    return [{ batch: detail, role: membership.role }]
  })
}
