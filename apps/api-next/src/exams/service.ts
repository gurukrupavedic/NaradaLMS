import { type SchoolDb, type SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound, unprocessable } from '../error'
import type { ExamReadScope } from '../utils/accessPolicy'
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
  await assertValidExamAssignment(context.db, data.studentId, data.chapterId)
  const row = await repository.insert(context.db, data)
  if (!row) {
    throw internalError()
  }

  return row
}

// A student can only be examined on a chapter belonging to a track they're
// enrolled in as a student.
async function assertValidExamAssignment(
  db: SchoolDb,
  studentId: string,
  chapterId: string,
): Promise<void> {
  const chapterRow = await repository.findChapterTrackId(db, chapterId)
  if (!chapterRow) {
    throw unprocessable('chapter not found')
  }

  const enrolled = await repository.findStudentEnrollmentForTrack(db, studentId, chapterRow.trackId)
  if (enrolled.length === 0) {
    throw unprocessable('student is not enrolled in a batch for this chapter')
  }
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
 * Records a result and completes the exam atomically: the evaluation insert and the
 * `evaluationId IS NULL`-guarded completion (repository.complete) run in one transaction, so a
 * losing concurrent call rolls back its evaluation insert instead of leaving an orphan row. Two
 * simultaneous calls therefore produce exactly one evaluation and one 409 for the loser.
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
    const evalRow = await repository.insertEvaluation(tx, {
      studentId: existing.studentId,
      chapterId: existing.chapterId,
      level: data.level,
      notes: data.notes,
      evaluatorId,
    })

    if (!evalRow) {
      throw internalError()
    }

    // Throwing here rolls back the evaluation insert above — see the transaction doc comment.
    const row = await repository.complete(tx, id, evalRow.id, new Date())
    if (!row) {
      throw conflict('a result was already recorded for this exam')
    }

    return row
  })
}
