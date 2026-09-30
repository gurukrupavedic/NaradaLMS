import { uuidv7, type SchoolDbClient } from '@narada/db'
import { putObject } from '@narada/storage'

import { notFound } from '../error'
import * as repository from './repository'
import { docChapterQueue, enqueueParseDocSet } from './queue'
import type { ParsedHeading } from './parse'
import type { DocChapterListItem, JobStatusResponse } from './schema'

const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type DocChaptersServiceContext = { db: SchoolDbClient; schoolId: string }

export type UploadedDocSet = { sa: Express.Multer.File; te: Express.Multer.File; en: Express.Multer.File }

/**
 * Uploads the 3 source documents to R2, records the upload, and enqueues its parse job — never
 * parses inline. See `docChapters/worker.ts` for the async processor and `PARSE_DOC_SET_QUEUE`'s
 * doc comment in `queue.ts` for why this is a queue rather than a synchronous request.
 */
export async function uploadDocSet(
  context: DocChaptersServiceContext,
  courseId: string,
  uploadedByProfileId: string | undefined,
  files: UploadedDocSet,
): Promise<{ jobId: string }> {
  const uploadId = uuidv7()
  const basePath = `schools/${context.schoolId}/courses/${courseId}/doc-chapters/${uploadId}`
  const [saObjectKey, teObjectKey, enObjectKey] = await Promise.all([
    storeUpload(`${basePath}/sanskrit.docx`, files.sa),
    storeUpload(`${basePath}/telugu.docx`, files.te),
    storeUpload(`${basePath}/english.docx`, files.en),
  ])

  await repository.insertUpload(context.db, {
    id: uploadId,
    courseId,
    uploadedByProfileId,
    saObjectKey,
    teObjectKey,
    enObjectKey,
  })

  const job = await enqueueParseDocSet({ schoolId: context.schoolId, courseId })
  // Always set by BullMQ on a successful add — the fallback only guards the type (`string | undefined`).
  return { jobId: job.id ?? uploadId }
}

async function storeUpload(key: string, file: Express.Multer.File): Promise<string> {
  await putObject(key, file.buffer, DOCX_CONTENT_TYPE)
  return key
}

/**
 * `jobId` alone isn't scoped to a school/course — BullMQ's job ids are small sequential integers,
 * shared across every school's queue, so this must also confirm the job actually belongs to the
 * caller's course before returning anything about it. A mismatch 404s, the same as a job that
 * doesn't exist at all, rather than 403ing and confirming that *some* job exists at that id.
 */
export async function getJobStatus(
  context: DocChaptersServiceContext,
  courseId: string,
  jobId: string,
): Promise<JobStatusResponse> {
  const job = await docChapterQueue.getJob(jobId)
  if (!job || job.data.schoolId !== context.schoolId || job.data.courseId !== courseId) {
    throw notFound('job not found')
  }

  const state = await job.getState()
  const progress = typeof job.progress === 'number' ? job.progress : 0

  return {
    status: toJobState(state),
    progress,
    result: job.returnvalue ?? null,
    error: job.failedReason ?? null,
  }
}

function toJobState(state: string): JobStatusResponse['status'] {
  if (state === 'completed') return 'completed'
  if (state === 'failed') return 'failed'
  if (state === 'active') return 'active'
  return 'queued'
}

export function listDocChapters(
  context: DocChaptersServiceContext,
  courseId: string,
  q?: string,
): Promise<DocChapterListItem[]> {
  return repository.listDocChapters(context.db, courseId, q)
}

/**
 * Upserts one parsed heading in its own transaction — the unit `docChapters/worker.ts` calls once
 * per heading in a doc set, keyed by `(courseId, title)`. See
 * `repository.ts::findExistingHeading`'s doc comment for the exact replace-vs-skip rule. Returns
 * `false` when the heading was skipped (already has an assigned segment), `true` otherwise.
 */
export async function upsertParsedHeading(
  context: DocChaptersServiceContext,
  data: { courseId: string; sourceUploadId: string; heading: ParsedHeading },
): Promise<boolean> {
  return context.db.transaction(async tx => {
    const existing = await repository.findExistingHeading(tx, data.courseId, data.heading.title)
    if (existing?.hasAssignedSegment) {
      return false
    }

    if (existing) {
      await repository.replaceHeadingSegments(tx, existing.id, {
        track: data.heading.track,
        sourceUploadId: data.sourceUploadId,
        verses: data.heading.verses,
      })
    } else {
      await repository.createHeadingWithSegments(tx, {
        courseId: data.courseId,
        title: data.heading.title,
        track: data.heading.track,
        sourceUploadId: data.sourceUploadId,
        verses: data.heading.verses,
      })
    }

    return true
  })
}
