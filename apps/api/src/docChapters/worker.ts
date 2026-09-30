import { Worker, type Job } from 'bullmq'

import { getSchoolDb } from '@narada/db'
import { getObject } from '@narada/storage'

import logger from '../logger'
import { redis } from '../redis'
import { parseDocSet } from './parse'
import { PARSE_DOC_SET_QUEUE, type ParseDocSetJobData, type ParseDocSetJobResult } from './queue'
import * as repository from './repository'
import { upsertParsedHeading } from './service'

let worker: Worker<ParseDocSetJobData, ParseDocSetJobResult> | undefined

/** Starts the in-process worker — one per API instance, `concurrency: 1` (a parse is CPU-bound; running two at once on one instance just contends for the same core). Call once, alongside the HTTP server. */
export function startDocChapterWorker(): Worker<ParseDocSetJobData, ParseDocSetJobResult> {
  worker = new Worker<ParseDocSetJobData, ParseDocSetJobResult>(PARSE_DOC_SET_QUEUE, processParseDocSet, {
    connection: redis,
    concurrency: 1,
  })

  worker.on('failed', (job, error) => {
    logger.error(
      { event: 'docChapters.parseJob.failed', jobId: job?.id, err: error },
      'doc chapter parse job failed',
    )
  })

  return worker
}

/**
 * Always processes the course's *current* (most recently created) upload rather than one named in
 * the job payload — see `queue.ts`'s `enqueueParseDocSet` doc comment for why: it's what makes a
 * second upload arriving while the first is still queued (dedup's least-covered state) actually
 * get processed, instead of silently dropped.
 */
export async function processParseDocSet(
  job: Job<ParseDocSetJobData, ParseDocSetJobResult>,
): Promise<ParseDocSetJobResult> {
  const { schoolId, courseId } = job.data
  const db = getSchoolDb(schoolId)

  const upload = await repository.findLatestUploadByCourse(db, courseId)
  if (!upload) {
    throw new Error(`no doc chapter upload found for course ${courseId}`)
  }

  const [sa, te, en] = await Promise.all([
    getObject(upload.saObjectKey),
    getObject(upload.teObjectKey),
    getObject(upload.enObjectKey),
  ])

  const headings = await parseDocSet({ sa, te, en })

  let headingsUpserted = 0
  let headingsSkipped = 0
  for (const [index, heading] of headings.entries()) {
    const upserted = await upsertParsedHeading(
      { db, schoolId },
      { courseId, sourceUploadId: upload.id, heading },
    )
    if (upserted) headingsUpserted += 1
    else headingsSkipped += 1

    await job.updateProgress(Math.round(((index + 1) / headings.length) * 100))
  }

  return { headingsUpserted, headingsSkipped }
}
