import 'server-only'

import { fetchApi } from '@/lib/api'
import type { EnrollmentRole } from '@/lib/types'

export async function enrollProfile(
  batchId: string,
  payload: { profileId: string; role: EnrollmentRole },
): Promise<void> {
  await fetchApi(`/batches/${batchId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function unenrollProfile(batchId: string, profileId: string): Promise<void> {
  await fetchApi(`/batches/${batchId}/members/${profileId}`, { method: 'DELETE' })
}
