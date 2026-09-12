import type { SchoolDbClient } from '@narada/db'

import { internalError, notFound, unprocessable } from '../error'
import { assertStudentEnrolledInBatch } from '../enrollment/service'
import { findById as findBatchById } from '../batches/repository'
import * as repository from './repository'
import type { CreateEvaluationData, Evaluation, FindEvaluationsData } from './schema'

type EvaluationServiceContext = { db: SchoolDbClient }

export async function findByBatch(
  context: EvaluationServiceContext,
  batchId: string,
  query: FindEvaluationsData,
): Promise<{ items: Evaluation[]; nextCursor: string | null }> {
  const batchRow = await findBatchById(context.db, batchId)
  if (!batchRow) {
    throw notFound()
  }

  return repository.findForBatch(context.db, batchId, batchRow.trackId, query)
}

export async function findByStudent(
  context: EvaluationServiceContext,
  batchId: string,
  studentId: string,
  query: FindEvaluationsData,
): Promise<{ items: Evaluation[]; nextCursor: string | null }> {
  const batchRow = await findBatchById(context.db, batchId)
  if (!batchRow) {
    throw notFound()
  }

  return repository.findForStudentInBatch(context.db, batchId, batchRow.trackId, studentId, query)
}

/**
 * Validation order matches PARITY_PLAN.md §10.5 exactly: enrollment-role first (422), then
 * chapter existence (404), then batch/track match (422) — preserved because it's an externally
 * meaningful error-precedence contract, not an implementation detail.
 */
export async function createEvaluation(
  context: EvaluationServiceContext,
  batchId: string,
  evaluatorId: string,
  data: CreateEvaluationData,
): Promise<Evaluation> {
  await assertStudentEnrolledInBatch(context.db, data.studentId, batchId)

  const chapterRow = await repository.findChapterTrackId(context.db, data.chapterId)
  if (!chapterRow) {
    throw notFound()
  }

  const batchRow = await findBatchById(context.db, batchId)
  if (!batchRow) {
    throw notFound()
  }

  if (chapterRow.trackId !== batchRow.trackId) {
    throw unprocessable('chapter does not belong to this batch track')
  }

  const row = await repository.insert(context.db, { ...data, batchId, evaluatorId })
  if (!row) {
    throw internalError()
  }

  return row
}
