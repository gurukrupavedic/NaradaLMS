import { Queue } from 'bullmq'

import { redis } from '../redis'

export const PARSE_DOC_SET_QUEUE = 'parse-doc-set'

// No upload id here on purpose — see `enqueueParseDocSet`'s doc comment. The job only names
// *which course* to process; the worker looks up that course's current upload itself.
export type ParseDocSetJobData = {
  schoolId: string
  courseId: string
}

export type ParseDocSetJobResult = {
  headingsUpserted: number
  // Doc chapters left untouched because a segment was already assigned to a course chapter — see
  // the upsert rule in repository.ts::upsertParsedHeading.
  headingsSkipped: number
}

export const docChapterQueue = new Queue<ParseDocSetJobData, ParseDocSetJobResult>(PARSE_DOC_SET_QUEUE, {
  connection: redis,
})

/**
 * Enqueues a parse job for a course, deduplicated by `courseId`: a second upload started while
 * one is already queued or running for the same course never runs as a separate, racing job.
 *
 * Deliberately does NOT carry the specific upload's id in the job payload. BullMQ's own
 * deduplication data-replacement only covers two of a job's three pre-run states — `replace`
 * rewrites a *delayed* job's data, `keepLastIfActive` guarantees a follow-up run after an *active*
 * job finishes — but neither touches a job sitting in plain *waiting* (the normal, undelayed
 * state these jobs are always added in), so a second upload arriving while the first is merely
 * queued would otherwise be silently dropped for good, with nothing left to ever process it.
 * Instead, the job only names the course; `worker.ts`'s processor always looks up that course's
 * *current* upload from Postgres when it actually runs — correct regardless of which enqueue call
 * "won" the dedup race, since the losing call's upload row was already committed before it lost.
 *
 * `replace`/`keepLastIfActive` are still kept: `keepLastIfActive` is what guarantees a course
 * uploaded again *while actively being processed* gets a guaranteed follow-up run at all (without
 * it, that second upload's job is dropped with no run left to pick it up); `replace` is harmless
 * here since these jobs carry no upload-specific data to overwrite.
 */
export function enqueueParseDocSet(data: ParseDocSetJobData) {
  return docChapterQueue.add('parse', data, {
    deduplication: { id: data.courseId, replace: true, keepLastIfActive: true },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
  })
}
