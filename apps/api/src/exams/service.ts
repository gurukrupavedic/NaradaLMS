import { type SchoolDb, type SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound, orNotFound, unprocessable } from '../error'
import { assertEnrolledInTrack } from '../enrollment/service'
import type { AccessPolicy, ExamReadScope } from '../utils/accessPolicy'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import { gradeExam, levelForOutcome } from './grading'
import * as repository from './repository'
import { exists as trackExists } from '../tracks/repository'
import type {
  CreateExamData,
  Exam,
  ExamWithDetail,
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
  courseId: string,
): Promise<{ items: ExamWithDetail[]; nextCursor: string | null }> {
  return repository.findMany(context.db, params, scope, courseId)
}

/** Bare exam row — internal use only (authorization checks, transition guards); see `findByIdWithDetail` for the read path. */
export async function findById(context: ExamServiceContext, id: string): Promise<Exam> {
  return orNotFound(await repository.findById(context.db, id))
}

export async function findByIdWithDetail(
  context: ExamServiceContext,
  id: string,
): Promise<ExamWithDetail> {
  return orNotFound(await repository.findByIdWithDetail(context.db, id))
}

/**
 * Booking a sitting is school-admin-only (`access.requireCanCreateExam`), independent of any
 * batch role, so that check runs first — no need to look up enrollments just to reject an
 * unauthorized caller. Only once authorized does this validate the student/track assignment
 * invariant; see {@link assertValidExamAssignment}.
 */
export async function createExam(
  context: ExamServiceContext & { access: AccessPolicy },
  data: CreateExamData,
): Promise<Exam> {
  context.access.requireCanCreateExam()
  await assertValidExamAssignment(context.db, data.studentId, data.trackId)

  const row = await withConstraintMapping(
    () => repository.insert(context.db, data),
    {
      [DbConstraint.examStudentIdFk]: () => unprocessable('student or track no longer exists'),
      [DbConstraint.examTrackIdFk]: () => unprocessable('student or track no longer exists'),
    },
  )

  if (!row) {
    throw internalError()
  }

  return row
}

// A student can only sit a track they're enrolled in as a student. The enrollment check lives in
// the enrollment domain (`assertEnrolledInTrack`); this function only adds the track lookup,
// which is exam-specific, not an enrollment concern.
async function assertValidExamAssignment(
  db: SchoolDb,
  studentId: string,
  trackId: string,
): Promise<void> {
  if (!(await trackExists(db, trackId))) {
    throw unprocessable('track not found')
  }

  await assertEnrolledInTrack(db, studentId, trackId)
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
 * Grades a sitting and completes it atomically: the exam's completion, its `examResult`, and the
 * evaluation of every chapter in the track all commit together or not at all.
 *
 * The evaluator supplies only the five marks; the children's bonus (from the student's year of
 * birth, so a student with none on file can't be graded), the total and the outcome are derived
 * here (grading.ts) and stored as a snapshot. A passing outcome (L1–L4) is then written as a fresh
 * evaluation on every published chapter of the track — deliberately allowed to lower a chapter's
 * grade, since a result is the latest word on the whole syllabus. `reappear` grants no level, so
 * it leaves the chapters exactly as they were.
 *
 * The completion is a compare-and-set on the status read before the transaction, so a losing
 * concurrent call — a second result (the exam is by then `completed`) or a concurrent status
 * change such as a cancellation — rolls back rather than leaving a stray result or overwriting a
 * committed change. It is told apart by a follow-up read inside the transaction: 404 if the exam
 * is gone, 409 "already recorded" if it is now completed, 409 "status changed concurrently"
 * otherwise. Failing the whole request (not just skipping the chapter writes) on any error keeps
 * a result from ever existing without the evaluations it implies.
 *
 * `evaluatedAt` stamps the result and the chapter evaluations it writes; it defaults to the
 * database's clock. The bulk school importer passes it so a result is strictly later than the
 * spreadsheet marks it was imported alongside — a transaction's `now()` is one instant for every
 * row, and "the latest evaluation wins" cannot break a tie.
 */
export async function recordExamResult(
  context: ExamServiceContext,
  id: string,
  evaluatorId: string,
  data: RecordExamResultData,
  options: { evaluatedAt?: Date } = {},
): Promise<ExamWithDetail> {
  const existing = await findById(context, id)
  if (!RECORDABLE_STATUSES.includes(existing.status)) {
    throw conflict(`cannot record a result for an exam in '${existing.status}' status`)
  }

  const yearOfBirth = await repository.findStudentYearOfBirth(context.db, existing.studentId)
  if (yearOfBirth === undefined) {
    throw unprocessable(
      "the student's year of birth isn't on file, so the children's bonus can't be worked out",
    )
  }

  const { notes, ...marks } = data
  // The sitting's own year, not the year it's recorded — a result entered in January for a
  // December sitting must not age the student a year.
  const graded = gradeExam(marks, yearOfBirth, existing.scheduledAt.getUTCFullYear())
  const level = levelForOutcome(graded.outcome)

  await context.db.transaction(async tx => {
    const completed = await repository.complete(tx, id, existing.status)
    if (!completed) {
      const current = orNotFound(await repository.findById(tx, id))
      if (current.status === 'completed')
        throw conflict('a result was already recorded for this exam')
      throw conflict('exam status changed concurrently')
    }

    const result = await withConstraintMapping(
      () =>
        repository.insertResult(tx, {
          examId: id,
          ...marks,
          ...graded,
          notes,
          evaluatorId,
          evaluatedAt: options.evaluatedAt,
        }),
      {
        [DbConstraint.examResultEvaluatorIdFk]: () => unprocessable('evaluator no longer exists'),
      },
    )
    if (!result) {
      throw internalError()
    }

    await writeChapterEvaluations(tx, existing, level, evaluatorId, notes, options.evaluatedAt)
  })

  return findByIdWithDetail(context, id)
}

/**
 * A school admin correcting an already-graded sitting's marks (a data-entry mistake), not a
 * second sitting — `access.requireCanRecordEvaluation` gates this route exactly like the original
 * recording, since a correction can move the certification level just as much as the first grade
 * did. Recomputes the bonus/total/outcome from the new marks the same way `recordExamResult` does,
 * and overwrites the `examResult` row in place (`repository.updateResult`, a plain `UPDATE` on
 * `examId`'s primary key — never a second row).
 *
 * Chapter evaluations are rewritten through the same {@link writeChapterEvaluations} helper as the
 * original recording, so the two can't drift: a corrected passing outcome is just as much "the
 * latest word on the whole syllabus" as the first one was, and a corrected `reappear` still leaves
 * existing evaluations untouched (this only ever adds a fresh evaluation, never retracts one — see
 * that function's own doc comment).
 *
 * No exam-status transition here (the exam is already `completed` and stays that way), so unlike
 * `recordExamResult` there's no compare-and-set to lose a race on — the transaction only keeps the
 * `examResult` overwrite and the evaluation rewrite atomic with each other.
 */
export async function correctExamResult(
  context: ExamServiceContext,
  id: string,
  evaluatorId: string,
  data: RecordExamResultData,
): Promise<ExamWithDetail> {
  const existing = await findById(context, id)
  if (existing.status !== 'completed') {
    throw conflict(
      `cannot correct a result for an exam in '${existing.status}' status — none has been recorded yet`,
    )
  }

  const yearOfBirth = await repository.findStudentYearOfBirth(context.db, existing.studentId)
  if (yearOfBirth === undefined) {
    throw unprocessable(
      "the student's year of birth isn't on file, so the children's bonus can't be worked out",
    )
  }

  const { notes, ...marks } = data
  const graded = gradeExam(marks, yearOfBirth, existing.scheduledAt.getUTCFullYear())
  const level = levelForOutcome(graded.outcome)

  await context.db.transaction(async tx => {
    const updated = await withConstraintMapping(
      () =>
        repository.updateResult(tx, id, {
          ...marks,
          ...graded,
          notes,
          evaluatorId,
          evaluatedAt: new Date(),
        }),
      {
        [DbConstraint.examResultEvaluatorIdFk]: () => unprocessable('evaluator no longer exists'),
      },
    )
    if (!updated) {
      // The precheck above ruled out "no result yet" — the only other way this matches zero rows
      // is the exam having been deleted between that read and here.
      throw notFound()
    }

    await writeChapterEvaluations(tx, existing, level, evaluatorId, notes)
  })

  return findByIdWithDetail(context, id)
}

/**
 * A passing outcome (L1–L4) is written as a fresh evaluation on every published chapter of the
 * track — deliberately allowed to lower a chapter's grade, since a result (original or corrected)
 * is the latest word on the whole syllabus. `reappear` grants no level, so this only ever adds
 * evaluations, never retracts the ones a since-corrected result implied. Shared by
 * `recordExamResult` and `correctExamResult` so the two can't disagree about what a result implies
 * for the chapters underneath it.
 */
async function writeChapterEvaluations(
  db: SchoolDb,
  exam: Exam,
  level: ReturnType<typeof levelForOutcome>,
  evaluatorId: string,
  notes: string | undefined,
  evaluatedAt?: Date,
): Promise<void> {
  if (!level) {
    return
  }

  const chapterIds = await repository.findGradableChapterIds(db, exam.trackId)
  await withConstraintMapping(
    () =>
      repository.insertEvaluations(
        db,
        chapterIds.map(chapterId => ({
          studentId: exam.studentId,
          chapterId,
          level,
          notes,
          evaluatorId,
          evaluatedAt,
        })),
      ),
    {
      [DbConstraint.evaluationStudentIdFk]: () =>
        unprocessable('student, chapter, or evaluator no longer exists'),
      [DbConstraint.evaluationChapterIdFk]: () =>
        unprocessable('student, chapter, or evaluator no longer exists'),
      [DbConstraint.evaluationEvaluatorIdFk]: () =>
        unprocessable('student, chapter, or evaluator no longer exists'),
    },
  )
}
