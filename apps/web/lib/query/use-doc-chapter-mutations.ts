'use client'

import { confirmDocChapterUpload, presignDocChapterUpload } from '@/lib/api/resources'
import { useEditMutation } from '@/lib/query/use-edit-mutation'

// Must match apps/api/src/docChapters/service.ts's DOCX_CONTENT_TYPE exactly: the presigned PUT
// URL signs this content type into the request, so a mismatched header here fails as an R2
// signature error, not a validation error — there's no graceful fallback for getting it wrong.
const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

async function putToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': DOCX_CONTENT_TYPE },
    body: file,
  })
  if (!response.ok) {
    throw new Error(`upload to storage failed (${response.status})`)
  }
}

export type DocChapterUploadInput = { sa: File; te: File; en: File }

/**
 * Uploads the 3 source documents straight to R2 (never through this server) and confirms the
 * upload, returning the parse job's id — never parses inline, so the caller still has to poll
 * `docChapterUploadJobQuery` for when it's actually done. One mutation, one toast: presign, the 3
 * PUTs, and confirm are all steps of the same user-facing action ("upload"), not separate ones.
 */
export function useUploadDocChapterSet(courseId: string) {
  return useEditMutation(
    {
      mutationFn: async (files: DocChapterUploadInput) => {
        const { uploadId, uploads } = await presignDocChapterUpload(courseId)
        await Promise.all([
          putToPresignedUrl(uploads.sa.uploadUrl, files.sa),
          putToPresignedUrl(uploads.te.uploadUrl, files.te),
          putToPresignedUrl(uploads.en.uploadUrl, files.en),
        ])
        return confirmDocChapterUpload(courseId, uploadId)
      },
    },
    {
      success: 'Upload received — parsing started.',
      failure: "Couldn't upload the source documents.",
    },
  )
}
