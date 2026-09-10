import { randomUUID } from 'crypto'

import type { SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound, unprocessable } from '../error'
import { getLogger } from '../requestContext'
import { readAudioDuration } from '../utils/audioMetadata'
import {
  audioObjectKey,
  deleteStoredObject,
  readStoredObjectBytes,
  signedDownloadUrl,
  signedUploadUrl,
  storedObjectExists,
} from '../utils/contentStorage'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import type { ContentReadView } from '../utils/accessPolicy'
import * as repository from './repository'
import type {
  AudioAsset,
  Chapter,
  ChapterDetail,
  CreateAudioAssetData,
  CreateAudioUploadData,
  CreateChapterData,
  ResegmentData,
  SetAudioMappingsData,
  UpdateChapterData,
  UpsertScriptData,
} from './schema'

type ChapterServiceContext = { db: SchoolDbClient }

/** A draft chapter under `learnerPreview` view 404s exactly like a nonexistent one — never 403 — so guessing an ID can't disclose hidden content. */
export async function findById(
  context: ChapterServiceContext,
  id: string,
  view: ContentReadView,
): Promise<ChapterDetail> {
  const row = await repository.findById(context.db, id, view)
  if (!row) {
    throw notFound()
  }

  return {
    id: row.id,
    trackId: row.trackId,
    code: row.code,
    title: row.title,
    status: row.status,
    order: row.order,
    script: row.script,
    scripts: row.scripts.map(s => ({
      key: s.script,
      label: s.label,
      short: s.shortLabel,
      fontClass: s.fontClass,
      text: s.text,
      // The relational query builder can only order by the table it's querying, not a joined
      // one — `scriptSegments` comes back in no particular order, so the shared segment's own
      // `order` (not `chapterScriptSegment`'s own, which doesn't exist) is applied here instead.
      segments: [...s.scriptSegments]
        .sort((a, b) => a.segment.order - b.segment.order)
        .map(ss => ({ id: ss.segment.id, start: ss.start, end: ss.end })),
    })),
    // Signed in parallel, not one at a time — a chapter with several takes shouldn't pay for N
    // sequential round trips to R2.
    audio: await Promise.all(
      row.audioAssets.map(async a => ({
        id: a.id,
        label: a.label,
        reciter: a.reciter,
        duration: a.duration,
        url: await signedDownloadUrl(a.objectKey),
        mappings: a.audioMappings.map(m => ({
          segmentId: m.segmentId,
          audioStart: m.audioStart,
          audioEnd: m.audioEnd,
        })),
      })),
    ),
  }
}

async function toAudioAssetResponse(row: {
  id: string
  label: string | null
  reciter: string
  duration: number
  objectKey: string
  audioMappings: { segmentId: string; audioStart: number; audioEnd: number }[]
}): Promise<AudioAsset> {
  return {
    id: row.id,
    label: row.label,
    reciter: row.reciter,
    duration: row.duration,
    url: await signedDownloadUrl(row.objectKey),
    mappings: row.audioMappings.map(m => ({
      segmentId: m.segmentId,
      audioStart: m.audioStart,
      audioEnd: m.audioEnd,
    })),
  }
}

/**
 * Upsert one script's text + its segment offsets, without corrupting sibling scripts or existing
 * audio mappings that share the chapter's `segment` rows:
 *
 *  - same segment count as the chapter already has → reuse the existing `segment.id`s
 *    positionally; only this script's `chapterScriptSegment` rows are replaced.
 *  - chapter has no segments yet → fresh `segment` rows are created for this first script.
 *  - segment count is changing → allowed only if nothing else (another script's offsets, an
 *    audio mapping) already depends on the current segments; otherwise 422, since resizing a
 *    timeline other scripts/audio rely on isn't something a single-script edit can safely do.
 */
export async function upsertScript(
  context: ChapterServiceContext,
  chapterId: string,
  scriptKey: string,
  data: UpsertScriptData,
): Promise<ChapterDetail> {
  await context.db.transaction(async tx => {
    const chapterRow = await repository.findById(tx, chapterId, { kind: 'authoring' })
    if (!chapterRow) throw notFound()

    const existingSegments = await repository.findSegmentsForChapter(tx, chapterId)
    const existingScript = chapterRow.scripts.find(s => s.script === scriptKey)

    let segmentRows: { id: string }[]
    if (existingSegments.length === data.segments.length) {
      segmentRows = existingSegments
    } else if (existingSegments.length === 0) {
      segmentRows = await repository.replaceChapterSegments(tx, chapterId, data.segments.length)
    } else {
      const deps = await repository.findSegmentDependents(
        tx,
        existingSegments.map(s => s.id),
        existingScript?.id ?? null,
      )
      if (deps.hasOtherScriptDependents || deps.hasAudioMappings) {
        throw unprocessable(
          "segment count must match this chapter's other scripts and existing audio mappings — resize segments from every dependent script/mapping together",
        )
      }
      segmentRows = await repository.replaceChapterSegments(tx, chapterId, data.segments.length)
    }

    const chapterScriptRow = await repository.upsertChapterScript(tx, chapterId, scriptKey, {
      label: data.label,
      shortLabel: data.short,
      fontClass: data.fontClass,
      text: data.text,
    })
    if (!chapterScriptRow) throw internalError()

    await repository.replaceChapterScriptSegments(
      tx,
      chapterScriptRow.id,
      data.segments.map((seg, i) => ({ segmentId: segmentRows[i]!.id, start: seg.start, end: seg.end })),
    )
  })

  return findById(context, chapterId, { kind: 'authoring' })
}

/**
 * Resize a chapter's whole segment timeline at once — every script must be resegmented together
 * (see `upsertScript`'s own doc comment for why a single script's save can't safely do this
 * alone). Unlike `upsertScript`, this never checks for dependents-blocking-a-resize: resegmenting
 * *is* the operation for when a resize is genuinely needed, so it just does it — deleting the
 * chapter's `segment` rows and letting the schema's cascades (`chapterScriptSegment`,
 * `audioMapping`, both `onDelete: cascade` on `segmentId`) clear every sibling script's old
 * offsets and every existing audio mapping. There is no way to safely infer how new segment
 * boundaries relate to old audio timing, so audio mappings are genuinely gone afterward, not
 * preserved — the caller (the admin, via the UI) needs to know that before submitting this.
 */
export async function resegmentChapter(
  context: ChapterServiceContext,
  chapterId: string,
  data: ResegmentData,
): Promise<ChapterDetail> {
  await context.db.transaction(async tx => {
    const chapterRow = await repository.findById(tx, chapterId, { kind: 'authoring' })
    if (!chapterRow) throw notFound()

    const existingKeys: string[] = chapterRow.scripts.map(s => s.script).sort()
    const submittedKeys = Object.keys(data.scripts).sort()
    const missing = existingKeys.filter(k => !submittedKeys.includes(k))
    const unexpected = submittedKeys.filter(k => !existingKeys.includes(k))
    if (missing.length > 0 || unexpected.length > 0) {
      throw unprocessable(
        `resegmenting requires new segments for exactly this chapter's existing scripts` +
          (missing.length > 0 ? ` — missing: ${missing.join(', ')}` : '') +
          (unexpected.length > 0 ? ` — no such script on this chapter: ${unexpected.join(', ')}` : ''),
      )
    }

    const count = Object.values(data.scripts)[0]?.segments.length ?? 0
    const segmentRows = await repository.replaceChapterSegments(tx, chapterId, count)

    for (const scriptRow of chapterRow.scripts) {
      const segments = data.scripts[scriptRow.script]!.segments
      await repository.replaceChapterScriptSegments(
        tx,
        scriptRow.id,
        segments.map((seg, i) => ({ segmentId: segmentRows[i]!.id, start: seg.start, end: seg.end })),
      )
    }
  })

  return findById(context, chapterId, { kind: 'authoring' })
}

// ── Chapter catalog management (title/order/status/archive) ────────────────

function toChapter(row: {
  id: string
  trackId: string
  code: string
  title: string
  status: 'draft' | 'published'
  order: number
  script: 'te' | 'sa' | 'en' | null
}): Chapter {
  return {
    id: row.id,
    trackId: row.trackId,
    code: row.code,
    title: row.title,
    status: row.status,
    order: row.order,
    script: row.script,
  }
}

export async function createChapter(context: ChapterServiceContext, data: CreateChapterData): Promise<Chapter> {
  const row = await withConstraintMapping(
    () =>
      context.db.transaction(async tx => {
        const order = await repository.nextChapterOrder(tx, data.trackId)
        return repository.insertChapter(tx, { trackId: data.trackId, code: data.code, title: data.title, order })
      }),
    {
      [DbConstraint.chapterTrackIdFk]: () => unprocessable('unknown or invalid track'),
      [DbConstraint.chapterTrackIdCodeUnique]: () => conflict('a chapter with this code already exists in this track'),
    },
  )

  if (!row) throw internalError()
  return toChapter(row)
}

/**
 * `archived` is a real column, distinct from `status` (see `packages/db/src/schema/school.ts`'s
 * `chapter.archived` doc comment) — a chapter that ever had student activity can't be hard-deleted
 * (`evaluation`/`exam` both reference `chapterId`), so "delete" in the admin UI sends
 * `{ status: 'draft', archived: true }` through this same endpoint rather than a separate one.
 *
 * A transition into or out of `archived` also reassigns `order`, inside the same transaction as
 * the field update: archiving pushes the chapter below every other row in the track so it can
 * never collide with a future active chapter's order (`nextArchivedOrder`); restoring (`archived:
 * false` on a currently-archived row) appends it back at the end (`nextChapterOrder`) — there's no
 * restore UI yet, but the schema allows it, so this stays correct if one is added later.
 */
export async function updateChapter(
  context: ChapterServiceContext,
  chapterId: string,
  data: UpdateChapterData,
): Promise<Chapter> {
  const row = await withConstraintMapping(
    () =>
      context.db.transaction(async tx => {
        const existing = await repository.findChapterRowById(tx, chapterId)
        if (!existing) throw notFound()

        let order: number | undefined
        if (data.archived === true && !existing.archived) {
          order = await repository.nextArchivedOrder(tx, existing.trackId)
        } else if (data.archived === false && existing.archived) {
          order = await repository.nextChapterOrder(tx, existing.trackId)
        }

        return repository.updateChapterRow(tx, chapterId, order === undefined ? data : { ...data, order })
      }),
    {
      [DbConstraint.chapterTrackIdCodeUnique]: () => conflict('a chapter with this code already exists in this track'),
    },
  )

  if (!row) throw internalError()
  return toChapter(row)
}

export async function createAudioUpload(
  context: ChapterServiceContext,
  chapterId: string,
  userId: string,
  schoolSlug: string,
  data: CreateAudioUploadData,
): Promise<{ uploadId: string; uploadUrl: string; expiresAt: string }> {
  const chapterRow = await repository.findById(context.db, chapterId, { kind: 'authoring' })
  if (!chapterRow) throw notFound()

  const uploadId = randomUUID()
  const objectKey = audioObjectKey({ schoolSlug, chapterId, uploadId, contentType: data.contentType })
  // Bookkeeping TTL for the `stagedUpload` row itself — distinct from the presigned URL's own
  // ~30 minute validity (`contentStorage.ts`'s `signedUploadUrl`), matching the old design's split.
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  const staged = await repository.createStagedUpload(context.db, {
    chapterId,
    purpose: 'audio',
    objectKey,
    contentType: data.contentType,
    createdByUserId: userId,
    expiresAt,
  })
  if (!staged) throw internalError()

  const { uploadUrl } = await signedUploadUrl(objectKey, data.contentType)
  return { uploadId: staged.id, uploadUrl, expiresAt: expiresAt.toISOString() }
}

export async function createAudioAsset(
  context: ChapterServiceContext,
  chapterId: string,
  data: CreateAudioAssetData,
): Promise<AudioAsset> {
  return context.db.transaction(async tx => {
    const staged = await repository.findStagedUpload(tx, data.uploadId, chapterId, 'audio')
    if (!staged) throw notFound()

    if (staged.status === 'completed') {
      // Idempotent retry: a confirm call that already succeeded once just returns the same asset.
      const existing = await repository.findAudioAssetByObjectKey(tx, chapterId, staged.objectKey)
      if (!existing) throw internalError()
      return toAudioAssetResponse(existing)
    }
    if (staged.status !== 'pending') {
      throw unprocessable('upload has already been completed or expired')
    }
    if (staged.expiresAt <= new Date()) {
      await repository.markStagedUploadExpired(tx, staged.id)
      throw unprocessable('upload has expired')
    }
    if (!(await storedObjectExists(staged.objectKey))) {
      throw unprocessable('uploaded object does not exist')
    }

    // The server's own read of what was actually uploaded — never the client's word for it. A
    // file that doesn't decode as real audio (wrong content, corrupt, mislabeled) is rejected
    // here rather than landing as an asset with a made-up duration.
    let duration: number
    try {
      const bytes = await readStoredObjectBytes(staged.objectKey)
      duration = await readAudioDuration(bytes, staged.contentType)
    } catch {
      throw unprocessable('could not read this file as audio — it may be corrupt or not a supported format')
    }

    await repository.markStagedUploadCompleted(tx, staged.id)

    const order = await repository.nextAudioAssetOrder(tx, chapterId)
    await repository.insertAudioAsset(tx, {
      chapterId,
      objectKey: staged.objectKey,
      label: data.label,
      reciter: data.reciter,
      duration,
      order,
    })

    // Re-fetched rather than trusting the insert's own `.returning()` (which is empty on the
    // `onConflictDoNothing` no-op path a racing retry can hit) — this way both paths return the
    // same shape through the same code.
    const row = await repository.findAudioAssetByObjectKey(tx, chapterId, staged.objectKey)
    if (!row) throw internalError()
    return toAudioAssetResponse(row)
  })
}

export async function setAudioMappings(
  context: ChapterServiceContext,
  chapterId: string,
  audioId: string,
  data: SetAudioMappingsData,
): Promise<AudioAsset> {
  return context.db.transaction(async tx => {
    const asset = await repository.findAudioAssetById(tx, audioId, chapterId)
    if (!asset) throw notFound()

    const segmentIds = [...new Set(data.mappings.map(m => m.segmentId))]
    const belongingCount = await repository.countSegmentsBelongingToChapter(tx, chapterId, segmentIds)
    if (belongingCount !== segmentIds.length) {
      throw unprocessable('one or more segments do not belong to this chapter')
    }

    await repository.replaceAudioMappings(tx, audioId, data.mappings)

    const row = await repository.findAudioAssetByObjectKey(tx, chapterId, asset.objectKey)
    if (!row) throw internalError()
    return toAudioAssetResponse(row)
  })
}

export async function deleteAudioAsset(
  context: ChapterServiceContext,
  chapterId: string,
  audioId: string,
): Promise<void> {
  const asset = await repository.findAudioAssetById(context.db, audioId, chapterId)
  if (!asset) throw notFound()

  await repository.deleteAudioAssetRow(context.db, audioId)

  // Best-effort, after the DB delete has already committed — an orphaned R2 object is cheap and
  // recoverable; a chapter that can't be edited because R2 hiccuped is not.
  try {
    await deleteStoredObject(asset.objectKey)
  } catch (err) {
    getLogger().warn({ err, objectKey: asset.objectKey }, 'failed to delete R2 object after audio asset deletion')
  }
}
