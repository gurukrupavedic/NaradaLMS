import type { SchoolDbClient } from '@narada/db'

import { conflict, notFound, orNotFound, unprocessable } from '../error'
import { findTrackIdsByChapterId } from '../chapters/repository'
import { findStudentIdsInBatch } from '../enrollment/service'
import { findById as findBatchById } from '../batches/repository'
import * as repository from './repository'
import type { CreateEvaluationData, Evaluation, FindEvaluationsData } from './schema'

type EvaluationServiceContext = { db: SchoolDbClient }

export async function findByBatch(
  context: EvaluationServiceContext,
  batchId: string,
  query: FindEvaluationsData,
): Promise<{ items: Evaluation[]; nextCursor: string | null }> {
  const batchRow = orNotFound(await findBatchById(context.db, batchId))

  return repository.findForBatch(context.db, batchId, batchRow.trackId, query)
}

export async function findByStudent(
  context: EvaluationServiceContext,
  batchId: string,
  studentId: string,
  query: FindEvaluationsData,
): Promise<{ items: Evaluation[]; nextCursor: string | null }> {
  const batchRow = orNotFound(await findBatchById(context.db, batchId))

  return repository.findForStudentInBatch(context.db, batchId, batchRow.trackId, studentId, query)
}

/**
 * One or many evaluations in a single request — the roster grid's per-cell grade dialog sends one
 * item, its "Promote to L3" row action sends one per not-yet-L3 chapter (mark-book.tsx computes
 * the list; the server doesn't need to re-derive "which chapters" since the caller already has the
 * grid on screen). Both go through the same validation and the same certified-chapter guard below
 * — there's exactly one write path into `evaluation`, not a bulk one and a single-item one.
 *
 * Validation order per item matches PARITY_PLAN.md §10.5 exactly: enrollment-role first (422),
 * then chapter existence (404), then batch/track match (422) — preserved because it's an
 * externally meaningful error-precedence contract, not an implementation detail. A structural
 * problem with any item throws and nothing is inserted, same as the old single-item endpoint.
 *
 * A chapter already at L4 is different: not a structural error, just silently excluded from what
 * gets inserted. Evaluations are append-only history — the *latest* one wins on the grid, purely
 * by timestamp, regardless of level (see mark-book.tsx's own doc comment) — so writing a fresh
 * teacher grade over an already-certified (admin-only, exam-graded) L4 chapter would silently
 * downgrade it. `teacherGradableLevelSchema` already stops a teacher from *setting* L4 directly;
 * this is what stops them from *burying* one. A bulk caller (promote) expects this and just gets
 * fewer rows back; a single-item caller gets an empty result, which `resources.ts`'s
 * `createEvaluation` on the web turns into a real error for the grade dialog to show.
 */
export async function createEvaluations(
  context: EvaluationServiceContext,
  batchId: string,
  evaluatorId: string,
  items: CreateEvaluationData[],
): Promise<Evaluation[]> {
  const batchRow = orNotFound(await findBatchById(context.db, batchId))

  const chapterIds = [...new Set(items.map(item => item.chapterId))]
  const studentIds = [...new Set(items.map(item => item.studentId))]

  // One lookup each for the whole request — a bulk promote carries an item per chapter, so
  // checking item by item would be a couple of round trips per row.
  const [enrolledStudentIds, trackIdByChapterId] = await Promise.all([
    findStudentIdsInBatch(context.db, studentIds, batchId),
    findTrackIdsByChapterId(context.db, chapterIds),
  ])

  for (const data of items) {
    if (!enrolledStudentIds.has(data.studentId)) {
      throw unprocessable('student is not enrolled in this batch')
    }

    const chapterTrackId = trackIdByChapterId.get(data.chapterId)
    if (chapterTrackId === undefined) {
      throw notFound()
    }

    if (chapterTrackId !== batchRow.trackId) {
      throw unprocessable('chapter does not belong to this batch track')
    }
  }

  const existing = await repository.findForChaptersAndStudents(context.db, chapterIds, studentIds)
  const latestByKey = latestEvaluationByKey(existing)

  const rowsToInsert = items
    .filter(item => latestByKey.get(evaluationKey(item.studentId, item.chapterId))?.level !== 'level4')
    .map(item => ({ ...item, batchId, evaluatorId }))

  const created = await repository.insertMany(context.db, rowsToInsert)

  // Every item was structurally valid but all of them landed on an already-certified chapter — a
  // single-cell grade of an L4 cell (the roster grid disables this, so it means a race: the exam
  // result landed between the cell rendering and the teacher submitting). A bulk promote hitting
  // this is normal and distinguishable by `items.length > 1`, so this only ever fires for the
  // single-item case in practice.
  if (created.length === 0 && items.length > 0) {
    throw conflict('this chapter has already been certified by an exam result')
  }

  return created
}

function evaluationKey(studentId: string, chapterId: string): string {
  return `${studentId}:${chapterId}`
}

/** Same "most recent evaluatedAt wins" rule as the web's own reshape.ts::latestLevelByChapterId —
 * duplicated rather than shared across the API/web boundary for a 10-line function. Keyed by
 * student+chapter (not chapter alone) since a bulk request isn't guaranteed to be one student. */
function latestEvaluationByKey(evaluations: Evaluation[]): Map<string, Evaluation> {
  const byKey = new Map<string, Evaluation>()
  for (const evaluation of evaluations) {
    const key = evaluationKey(evaluation.studentId, evaluation.chapterId)
    const existing = byKey.get(key)
    if (!existing || (evaluation.evaluatedAt?.getTime() ?? -Infinity) > (existing.evaluatedAt?.getTime() ?? -Infinity)) {
      byKey.set(key, evaluation)
    }
  }
  return byKey
}
