import 'server-only'

import { fetchApi } from '@/lib/api'
import type { ApiTrack } from '@/lib/types'

export async function getTracks(): Promise<ApiTrack[]> {
  return fetchApi<ApiTrack[]>('/tracks')
}

export async function getTrack(trackId: string): Promise<ApiTrack> {
  return fetchApi<ApiTrack>(`/tracks/${trackId}`)
}
