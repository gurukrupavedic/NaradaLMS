import { type SchoolDb, type SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound, unprocessable } from '../error'
import type { ExamReadScope } from '../utils/accessPolicy'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import * as repository from './repository'
import type {
  CreateExamData,
  Exam,
  FindExamsData,
  RecordExamResultData,
  UpdateExamData,
} from './schema'
import { assertValidTransition } from './transitions'

const RECORDABLE_STATUSES: Exam['status'][] = ['scheduled', 'inProgress']

type ExamServiceContext = { db: SchoolDbClient }

export async function findExams(
  context: ExamServiceContext,
  params: FindExamsData,
  scope: ExamReadScope,
): Promise<{ items: Exam[]; nextCursor: string | null }> {
  return repository.findMany(context.db, params, scope)
}

export async function findById(context: ExamServiceContext, id: string): Promise<Exam> {
  const row = await repository.findById(context.db, id)
  if (!row) {
    throw notFound()
  }

  return row
}

/** Validates the student/chapter assignment invariant before inserting; see {@link assertValidExamAssignment}. */
export async function createExam(context: ExamServiceContext, data: CreateExamData): Promise<Exam> {
  const batchId = await assertValidExamAssignment(context.db, data.studentId, data.chapterId)
  const row = await withConstraintMapping(
    () => repository.insert(context.db, { ...data, batchId }),
    {
      [DbConstraint.examStudentIdFk]: () => unprocessable('student or chapter no longer exists'),
      [DbConstraint.examChapterIdFk]: () => unprocessable('student or chapter no longer exists'),
    },
  )

  if (!row) {
    throw internalError()
  }

  return row
}

// A student can only be examined on a chapter belonging to a track they're
// enrolled in as a student, and that enrollment must be unambiguous — the
// resolved batch is stored on the exam as immutable assessment context (DD-012).
async function assertValidExamAssignment(
  db: SchoolDb,
  studentId: string,
  chapterId: string,
): Promise<string> {
  const chapterRow = await repository.findChapterTrackId(db, chapterId)
  if (!chapterRow) {
    throw unprocessable('chapter not found')
  }

  const enrolled = await repository.findStudentEnrollmentForTrack(db, studentId, chapterRow.trackId)
  if (enrolled.length === 0) {
    throw unprocessable('student is not enrolled in a batch for this chapter')
  }

  if (enrolled.length > 1) {
    throw unprocessable("student is enrolled in multiple batches for this chapter's track")
  }

  const [only] = enrolled
  if (!only) {
    throw internalError()
  }

  return only.batchId
}

/**
 * Reads the exam once, then applies `data` guarded by a compare-and-set on the status read at
 * that point (not re-read afterward) — this is what makes a concurrent status change lose rather
 * than silently overwrite. A lost race and a since-deleted exam both fail the guarded update, so
 * a follow-up read distinguishes 409 (still exists, status moved) from 404 (gone).
 */
export async function updateExam(
  context: ExamServiceContext,
  id: string,
  data: UpdateExamData,
): Promise<Exam> {
  const existing = await findById(context, id)
  if (data.status && data.status !== existing.status) {
    assertValidTransition(existing.status, data.status)
  }

  const row = await repository.updateGuarded(context.db, id, data, existing.status)
  if (!row) {
    // Either the exam was deleted, or its status changed since we read it.
    const stillExists = await repository.findById(context.db, id)
    throw stillExists ? conflict('exam status changed concurrently') : notFound()
  }

  return row
}

/**
 * Records a result and completes the exam atomically: the evaluation insert and the completion
 * (repository.complete) run in one transaction. The completion is guarded by both
 * `evaluationId IS NULL` and a compare-and-set on the status read before the transaction, so a
 * losing concurrent call — whether a second result or a concurrent status change (e.g. a
 * cancellation) — rolls back its evaluation insert instead of leaving an orphan row or silently
 * overwriting a committed status change. A lost race is distinguished by a follow-up read inside
 * the transaction: 404 if the exam is gone, 409 "already recorded" if `evaluationId` is set, 409
 * "status changed concurrently" otherwise.
 */
export async function recordExamResult(
  context: ExamServiceContext,
  id: string,
  evaluatorId: string,
  data: RecordExamResultData,
): Promise<Exam> {
  const existing = await findById(context, id)
  if (!RECORDABLE_STATUSES.includes(existing.status)) {
    throw conflict(`cannot record a result for an exam in '${existing.status}' status`)
  }

  return context.db.transaction(async tx => {
    const evalRow = await withConstraintMapping(
      () =>
        repository.insertEvaluation(tx, {
          studentId: existing.studentId,
          chapterId: existing.chapterId,
          batchId: existing.batchId,
          level: data.level,
          notes: data.notes,
          evaluatorId,
        }),
      {
        [DbConstraint.evaluationStudentIdFk]: () =>
          unprocessable('student, chapter, or evaluator no longer exists'),
        [DbConstraint.evaluationChapterIdFk]: () =>
          unprocessable('student, chapter, or evaluator no longer exists'),
        [DbConstraint.evaluationEvaluatorIdFk]: () =>
          unprocessable('student, chapter, or evaluator no longer exists'),
      },
    )

    if (!evalRow) {
      throw internalError()
    }

    // Throwing here rolls back the evaluation insert above — see the transaction doc comment.
    const row = await repository.complete(tx, id, evalRow.id, new Date(), existing.status)
    if (!row) {
      const current = await repository.findById(tx, id)
      if (!current) throw notFound()
      if (current.evaluationId) throw conflict('a result was already recorded for this exam')
      throw conflict('exam status changed concurrently')
    }

    return row
  })
}
