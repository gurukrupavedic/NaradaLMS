import { fetchApi, mutateApi } from '@/lib/api/client'
import type { ApiTrackTa, ApiTrackTaCandidate } from '@/lib/api/api-types'

// GET /v1/track-tas — every listed TA in the course, all tracks at once; callers group by
// `trackId`. Readable by any course member (the student ladder shows it too).
export async function fetchTrackTas(): Promise<ApiTrackTa[]> {
  return fetchApi<ApiTrackTa[]>('/track-tas')
}

// GET /v1/track-tas/candidates/:trackId — admin only: active TAs with L3 on every chapter of the
// track who aren't listed yet. The server re-checks this when one is actually added.
export async function fetchTrackTaCandidates(trackId: string): Promise<ApiTrackTaCandidate[]> {
  return fetchApi<ApiTrackTaCandidate[]>(`/track-tas/candidates/${trackId}`)
}

export async function addTrackTa(input: { trackId: string; profileId: string }): Promise<ApiTrackTa> {
  return mutateApi<ApiTrackTa>('/track-tas', 'POST', input)
}

export async function removeTrackTa(input: { trackId: string; profileId: string }): Promise<void> {
  return mutateApi<void>(`/track-tas/${input.trackId}/${input.profileId}`, 'DELETE')
}
