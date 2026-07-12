import 'server-only'

import { fetchApi } from '@/lib/api'
import { fetchAllPages } from '@/lib/api/pagination'
import type { ProficiencyLevel } from '@/lib/proficiency'
import type { ApiEvaluation, ApiPage } from '@/lib/types'

export async function getBatchEvaluationsPage(
  batchId: string,
  params?: { cursor?: string; limit?: number },
): Promise<ApiPage<ApiEvaluation>> {
  const query = new URLSearchParams()
  if (params?.cursor) query.set('cursor', params.cursor)
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return fetchApi<ApiPage<ApiEvaluation>>(`/batches/${batchId}/evaluations${qs ? `?${qs}` : ''}`)
}

// Walks every page — the roster view needs the full "latest evaluation per student+chapter"
// picture, not one page at a time.
export async function getBatchEvaluations(batchId: string): Promise<ApiEvaluation[]> {
  return fetchAllPages(cursor => getBatchEvaluationsPage(batchId, { cursor }))
}

export async function getStudentEvaluations(
  batchId: string,
  studentId: string,
): Promise<ApiEvaluation[]> {
  return fetchAllPages(cursor => {
    const query = new URLSearchParams()
    if (cursor) query.set('cursor', cursor)
    const qs = query.toString()
    return fetchApi<ApiPage<ApiEvaluation>>(
      `/batches/${batchId}/evaluations/${studentId}${qs ? `?${qs}` : ''}`,
    )
  })
}

export async function createEvaluation(
  batchId: string,
  payload: { studentId: string; chapterId: string; level: ProficiencyLevel; notes?: string },
): Promise<ApiEvaluation> {
  return fetchApi<ApiEvaluation>(`/batches/${batchId}/evaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
