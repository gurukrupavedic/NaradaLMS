import 'server-only'

import { fetchApi } from '@/lib/api'
import type { ApiDashboard } from '@/lib/types'

export async function getDashboard(): Promise<ApiDashboard> {
  return fetchApi<ApiDashboard>('/me/dashboard')
}
