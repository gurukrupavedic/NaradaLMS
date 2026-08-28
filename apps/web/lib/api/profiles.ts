import 'server-only'

import { fetchApi } from '@/lib/api'
import type { ApiProfile } from '@/lib/types'

export async function searchProfiles(params: {
  query?: string
  excludeBatchId?: string
}): Promise<ApiProfile[]> {
  const query = new URLSearchParams()
  if (params.query) query.set('query', params.query)
  if (params.excludeBatchId) query.set('excludeBatchId', params.excludeBatchId)
  const qs = query.toString()
  return fetchApi<ApiProfile[]>(`/profiles/search${qs ? `?${qs}` : ''}`)
}
