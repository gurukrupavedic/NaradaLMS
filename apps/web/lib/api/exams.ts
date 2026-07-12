import 'server-only'

import { fetchApi } from '@/lib/api'
import type { ApiExam, ApiPage, ExamStatus } from '@/lib/types'

export async function getExams(params?: {
  status?: ExamStatus
  cursor?: string
  limit?: number
}): Promise<ApiPage<ApiExam>> {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.cursor) query.set('cursor', params.cursor)
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return fetchApi<ApiPage<ApiExam>>(`/exams${qs ? `?${qs}` : ''}`)
}
