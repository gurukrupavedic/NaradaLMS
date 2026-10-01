import { uuidv7, type SchoolDb, type SchoolDbClient } from '@narada/db'
import { getUploadUrl, objectExists } from '@narada/storage'

import { notFound, orNotFound, unprocessable } from '../error'
import * as repository from './repository'
import { docChapterQueue, enqueueParseDocSet } from './queue'
import type { ParsedHeading } from './parse'
import type { DocChapterDetail, DocChapterListItem, JobStatusResponse, PresignUploadResponse, ScriptKey } from './schema'

const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type DocChaptersServiceContext = { db: SchoolDbClient; schoolId: string }

function objectKeysFor(schoolId: string, courseId: string, uploadId: string) {
  const basePath = `schools/${schoolId}/courses/${courseId}/doc-chapters/${uploadId}`
  return {
    sa: `${basePath}/sanskrit.docx`,
    te: `${basePath}/telugu.docx`,
    en: `${basePath}/english.docx`,
  }
}

/**
 * Issues presigned R2 PUT URLs for the 3 source documents — the client uploads directly to R2,
 * never through this server. Writes nothing to the database yet: `uploadId` only becomes a real
 * `docChapterUpload` row once `confirmUpload` has verified the objects actually landed, so an
 * abandoned presign (the client never finishes, or never calls back at all) leaves nothing behind
 * to clean up.
 */
export async function presignUpload(
  context: DocChaptersServiceContext,
  courseId: string,
): Promise<PresignUploadResponse> {
  const uploadId = uuidv7()
  const keys = objectKeysFor(context.schoolId, courseId, uploadId)

  const [sa, te, en] = await Promise.all([
    getUploadUrl(keys.sa, DOCX_CONTENT_TYPE),
    getUploadUrl(keys.te, DOCX_CONTENT_TYPE),
    getUploadUrl(keys.en, DOCX_CONTENT_TYPE),
  ])

  return { uploadId, uploads: { sa, te, en } }
}

/**
 * Confirms all 3 objects for `uploadId` actually exist in R2, records the upload, and enqueues its
 * parse job — never parses inline. See `docChapters/worker.ts` for the async processor and
 * `PARSE_DOC_SET_QUEUE`'s doc comment in `queue.ts` for why this is a queue rather than a
 * synchronous request.
 */
export async function confirmUpload(
  context: DocChaptersServiceContext,
  courseId: string,
  uploadedByProfileId: string | undefined,
  uploadId: string,
): Promise<{ jobId: string }> {
  const keys = objectKeysFor(context.schoolId, courseId, uploadId)

  const [saExists, teExists, enExists] = await Promise.all([
    objectExists(keys.sa),
    objectExists(keys.te),
    objectExists(keys.en),
  ])

  const missing = (['sa', 'te', 'en'] as const).filter(
    script => !{ sa: saExists, te: teExists, en: enExists }[script],
  )
  if (missing.length > 0) {
    throw unprocessable(`upload incomplete — missing: ${missing.join(', ')}`)
  }

  await repository.insertUpload(context.db, {
    id: uploadId,
    courseId,
    uploadedByProfileId,
    saObjectKey: keys.sa,
    teObjectKey: keys.te,
    enObjectKey: keys.en,
  })

  const job = await enqueueParseDocSet({ schoolId: context.schoolId, courseId })
  // Always set by BullMQ on a successful add — the fallback only guards the type (`string | undefined`).
  return { jobId: job.id ?? uploadId }
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

// ── Doc chapter workspace (segment cleanup) ─────────────────────────────────
// split/merge/delete below each read-then-write a doc chapter's segment order with no row lock —
// two genuinely concurrent mutations of the *same* doc chapter (a double-click, or two admins on
// it at once) could race under READ COMMITTED. Acceptable for now (admin-only, low-traffic, no
// reports of it happening); a `.for('update')` lock on the doc chapter's segments is the fix if it
// ever becomes real, same as the note on `findExistingHeading` above.

type DocChapterDetailRow = NonNullable<Awaited<ReturnType<typeof repository.findDocChapterDetail>>>
type SegmentRow = NonNullable<Awaited<ReturnType<typeof repository.findSegmentInDocChapter>>>

function toDetail(row: DocChapterDetailRow): DocChapterDetail {
  return {
    id: row.id,
    title: row.title,
    track: row.track,
    segments: row.segments.map(s => ({
      id: s.id,
      order: s.order,
      chapterId: s.chapterId,
      flaggedForReview: s.flaggedForReview,
      scripts: Object.fromEntries(s.segmentTexts.map(t => [t.script, t.text])),
    })),
  }
}

function wordsOf(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}

/** `undefined` when neither side has text for this script — never an empty string, which `segmentText`'s own non-empty check would reject anyway. */
function concatText(a: string | undefined, b: string | undefined): string | undefined {
  if (a && b) return `${a} ${b}`
  return a ?? b
}

export async function getDocChapterDetail(db: SchoolDb, docChapterId: string): Promise<DocChapterDetail> {
  return toDetail(orNotFound(await repository.findDocChapterDetail(db, docChapterId)))
}

/**
 * Splits a segment in two at a word boundary within one script's text — the script currently shown
 * in the cleanup UI, never all three at once, since word boundaries don't line up across scripts.
 * The first segment keeps its id (and every other script's text, untouched); the second is brand
 * new and starts with no text at all for the other scripts. Both come out `flaggedForReview`: the
 * first because its other-script text may now cover more than its own half, the second because it
 * has none yet — see `segment.flaggedForReview`'s own doc comment.
 */
export async function splitSegment(
  db: SchoolDbClient,
  docChapterId: string,
  segmentId: string,
  data: { script: ScriptKey; wordIndex: number },
): Promise<DocChapterDetail> {
  return db.transaction(async tx => {
    const seg = orNotFound(await repository.findSegmentInDocChapter(tx, docChapterId, segmentId))
    const textRow = seg.segmentTexts.find(t => t.script === data.script)
    if (!textRow) throw unprocessable(`segment has no ${data.script} text to split`)

    const words = wordsOf(textRow.text)
    if (data.wordIndex < 1 || data.wordIndex >= words.length) {
      throw unprocessable("wordIndex is out of range for this segment's text")
    }

    const before = words.slice(0, data.wordIndex).join(' ')
    const after = words.slice(data.wordIndex).join(' ')

    const orderedIds = await repository.findOrderedSegmentIds(tx, docChapterId)
    const insertAt = orderedIds.indexOf(segmentId)
    const newSegmentId = uuidv7()
    const nextOrderedIds = [...orderedIds.slice(0, insertAt + 1), newSegmentId, ...orderedIds.slice(insertAt + 1)]

    await repository.insertSegmentRow(tx, {
      id: newSegmentId,
      docChapterId,
      chapterId: seg.chapterId,
      flaggedForReview: true,
    })
    await repository.renumberSegments(tx, nextOrderedIds)
    await repository.upsertSegmentText(tx, segmentId, data.script, before)
    await repository.upsertSegmentText(tx, newSegmentId, data.script, after)
    await repository.updateSegment(tx, segmentId, { flaggedForReview: true })

    return toDetail(orNotFound(await repository.findDocChapterDetail(tx, docChapterId)))
  })
}

function mergedChapterIdOf(a: SegmentRow, b: SegmentRow): string | null {
  if (a.chapterId && b.chapterId && a.chapterId !== b.chapterId) {
    throw unprocessable('cannot merge segments assigned to different chapters')
  }
  return a.chapterId ?? b.chapterId
}

/**
 * Merges a segment with the one immediately after it (by `order`) — concatenating each script's
 * text (space-joined; a script neither side has stays absent) and keeping the first segment's id,
 * so any existing assignment on it survives. Inverse of `splitSegment`, so a misclick can be undone
 * immediately.
 *
 * Does NOT preserve the second segment's `audioMapping` rows — they cascade away with it (see
 * `deleteSegmentRow`). Fine today (no audio endpoints exist yet to have created any), but revisit
 * this once they do: merging two segments that both already have mapped audio currently has no way
 * to shift/reconcile the second half's timing onto the survivor, so it would silently disappear.
 */
export async function mergeSegmentWithNext(
  db: SchoolDbClient,
  docChapterId: string,
  segmentId: string,
): Promise<DocChapterDetail> {
  return db.transaction(async tx => {
    const seg = orNotFound(await repository.findSegmentInDocChapter(tx, docChapterId, segmentId))
    const next = await repository.findNextSegment(tx, docChapterId, seg.order)
    if (!next) throw unprocessable('no next segment to merge with')

    const mergedChapterId = mergedChapterIdOf(seg, next)

    for (const script of ['sa', 'te', 'en'] as const) {
      const merged = concatText(
        seg.segmentTexts.find(t => t.script === script)?.text,
        next.segmentTexts.find(t => t.script === script)?.text,
      )
      if (merged !== undefined) {
        await repository.upsertSegmentText(tx, segmentId, script, merged)
      }
    }

    await repository.updateSegment(tx, segmentId, {
      chapterId: mergedChapterId,
      flaggedForReview: seg.flaggedForReview || next.flaggedForReview,
    })
    await repository.deleteSegmentRow(tx, next.id)
    await repository.renumberSegments(tx, await repository.findOrderedSegmentIds(tx, docChapterId))

    return toDetail(orNotFound(await repository.findDocChapterDetail(tx, docChapterId)))
  })
}

/** Hard delete — cascades `segmentText` and any `audioMapping` (see `packages/db/src/schema/school.ts`). The one genuinely destructive segment action; the client's own confirm step gates calling this at all. */
export async function deleteSegment(
  db: SchoolDbClient,
  docChapterId: string,
  segmentId: string,
): Promise<DocChapterDetail> {
  return db.transaction(async tx => {
    orNotFound(await repository.findSegmentInDocChapter(tx, docChapterId, segmentId))
    await repository.deleteSegmentRow(tx, segmentId)
    await repository.renumberSegments(tx, await repository.findOrderedSegmentIds(tx, docChapterId))

    return toDetail(orNotFound(await repository.findDocChapterDetail(tx, docChapterId)))
  })
}
