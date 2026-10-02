import { fetchApi, mutateApi } from '@/lib/api/client'
import type { ApiDocChapterListItem, ApiJobStatus, ApiPresignUploadResponse } from '@/lib/api/api-types'

// Unlike every other admin resource (course-scoped purely through the `x-course-slug` header,
// `apps/api` resolving the real id itself), these endpoints take a real courseId in the path —
// `courseQuery`/`course.id` is how a caller gets one.

export async function presignDocChapterUpload(courseId: string): Promise<ApiPresignUploadResponse> {
  return mutateApi<ApiPresignUploadResponse>(
    `/courses/${encodeURIComponent(courseId)}/doc-chapters/upload/presign`,
    'POST',
  )
}

export async function confirmDocChapterUpload(courseId: string, uploadId: string): Promise<{ jobId: string }> {
  return mutateApi<{ jobId: string }>(
    `/courses/${encodeURIComponent(courseId)}/doc-chapters/upload/confirm`,
    'POST',
    { uploadId },
  )
}

export async function fetchDocChapterUploadStatus(courseId: string, jobId: string): Promise<ApiJobStatus> {
  return fetchApi<ApiJobStatus>(
    `/courses/${encodeURIComponent(courseId)}/doc-chapters/upload/${encodeURIComponent(jobId)}`,
  )
}

export async function fetchDocChapters(courseId: string, q: string): Promise<ApiDocChapterListItem[]> {
  const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  const { items } = await fetchApi<{ items: ApiDocChapterListItem[] }>(
    `/courses/${encodeURIComponent(courseId)}/doc-chapters${query}`,
  )
  return items
}
