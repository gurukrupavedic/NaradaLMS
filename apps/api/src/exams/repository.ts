import { and, asc, desc, eq, getTableColumns, gt, inArray, or, type SQL } from 'drizzle-orm'

import { chapter, evaluation, exam, examResult, track, type SchoolDb } from '@narada/db'

import type { ExamReadScope } from '../utils/accessPolicy'
import { paginateResponse } from '../utils/cursor'
import { levelForOutcome } from './grading'
import type {
  CreateExamData,
  Exam,
  ExamResult,
  ExamWithDetail,
  FindExamsData,
  StudentExamResult,
  UpdateExamData,
} from './schema'

export type Evaluation = typeof evaluation.$inferSelect
type ExamResultRow = typeof examResult.$inferSelect

/** What a `GET /exams`-style read eager-loads: the track's name and the result (if any). */
const DETAIL = {
  track: { columns: { id: true, name: true } },
  result: true,
} as const

// `level` is derived from `outcome` rather than stored (a `reappear` grants none), so a stored
// row gains it here — one place, so no reader can forget or disagree about the mapping.
function withLevel<Row extends ExamResultRow>(row: Row): Row & { level: ExamResult['level'] } {
  return { ...row, level: levelForOutcome(row.outcome) }
}

function toDetail<Row extends { result: ExamResultRow | null }>(row: Row) {
  return { ...row, result: row.result ? withLevel(row.result) : null }
}

/**
 * Lists exams visible under `scope`, ordered by `(scheduledAt, id)` with a matching compound
 * cursor. Eager-loads track/result detail (§0.4 of the resync addendum) — a bare `Exam` row has
 * only a `trackId`, not enough to render on its own, and `apps/api/src`'s reference
 * `findManyExams` does the same eager-load in this exact query rather than a follow-up fan-out.
 */
// An exam belongs to a course through its track.
function tracksOfCourse(db: SchoolDb, courseId: string) {
  return db.select({ id: track.id }).from(track).where(eq(track.courseId, courseId))
}

export async function findMany(
  db: SchoolDb,
  { status, cursor, limit }: FindExamsData,
  scope: ExamReadScope,
  courseId: string,
): Promise<{ items: ExamWithDetail[]; nextCursor: string | null }> {
  const conditions: SQL[] = []
  conditions.push(inArray(exam.trackId, tracksOfCourse(db, courseId)))

  if (scope.kind === 'own') {
    conditions.push(eq(exam.studentId, scope.profileId))
  } else if (scope.kind === 'manageable') {
    // `batchIds` is guaranteed non-empty by `AccessPolicy.getExamVisibility` (an empty-permission
    // actor gets 'own' instead), so `inArray` never has to handle a zero-length list here.
    conditions.push(
      or(eq(exam.studentId, scope.profileId), inArray(exam.batchId, scope.batchIds))!,
    )
  }

  if (status) {
    conditions.push(eq(exam.status, status))
  }

  if (cursor) {
    // `or()` is only typed as possibly-undefined for a zero-argument call; both
    // branches here are always-defined `SQL`, so the result is never undefined.
    conditions.push(
      or(
        gt(exam.scheduledAt, cursor.scheduledAt),
        and(eq(exam.scheduledAt, cursor.scheduledAt), gt(exam.id, cursor.id)),
      )!,
    )
  }

  const rows = await db.query.exam.findMany({
    where: and(...conditions),
    orderBy: [asc(exam.scheduledAt), asc(exam.id)],
    limit: limit + 1,
    with: DETAIL,
  })

  const page = paginateResponse(rows, limit, item => ({ scheduledAt: item.scheduledAt, id: item.id }))
  return { items: page.items.map(toDetail), nextCursor: page.nextCursor }
}

/** Bare exam row — for internal service logic (authorization checks, transition guards) that only ever reads `Exam`'s own columns, never track/result detail. */
export async function findById(db: SchoolDb, id: string): Promise<Exam | undefined> {
  return db.query.exam.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  })
}

/** The `GET /:examId` read path — list-detail equivalence (§11.3/DD-004): same eager-load as {@link findMany}, not a separate, thinner shape. */
export async function findByIdWithDetail(db: SchoolDb, id: string): Promise<ExamWithDetail | undefined> {
  const row = await db.query.exam.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: DETAIL,
  })
  return row && toDetail(row)
}

/** Backs the dashboard's "upcoming exams" panel — one relational query, track/result eager-loaded, not a fan-out. */
export async function findUpcomingForStudent(
  db: SchoolDb,
  studentId: string,
  courseId: string,
): Promise<ExamWithDetail[]> {
  const rows = await db.query.exam.findMany({
    where: (t, { and: andCols, eq: eqCol, inArray: inArrayCol }) =>
      andCols(
        eqCol(t.studentId, studentId),
        eqCol(t.status, 'scheduled'),
        inArrayCol(t.trackId, tracksOfCourse(db, courseId)),
      ),
    orderBy: (t, { asc: ascCol }) => ascCol(t.scheduledAt),
    with: DETAIL,
  })
  return rows.map(toDetail)
}

/**
 * Every result ever recorded for this student, across every track — full history, newest first,
 * not deduped to "current" (mirrors `evaluations/repository.ts::findAllForStudent`: achievements
 * outlive enrollment, and "the" current result per track is for the caller to reduce). This is
 * what stands in for the old `trackCertification` list on the dashboard.
 */
export async function findResultsForStudent(
  db: SchoolDb,
  studentId: string,
  courseId: string,
): Promise<StudentExamResult[]> {
  const rows = await db
    .select({ ...getTableColumns(examResult), trackId: exam.trackId })
    .from(examResult)
    .innerJoin(exam, eq(exam.id, examResult.examId))
    .where(
      and(
        eq(exam.studentId, studentId),
        inArray(exam.trackId, tracksOfCourse(db, courseId)),
      ),
    )
    .orderBy(desc(examResult.evaluatedAt))

  return rows.map(withLevel)
}

export async function findTrackById(
  db: SchoolDb,
  trackId: string,
): Promise<{ id: string } | undefined> {
  return db.query.track.findFirst({
    where: (t, { eq }) => eq(t.id, trackId),
    columns: { id: true },
  })
}

/** `undefined` for a missing profile *and* for one with no year of birth on file — the service treats both as "cannot compute the children's bonus." */
export async function findStudentYearOfBirth(
  db: SchoolDb,
  studentId: string,
): Promise<number | undefined> {
  const row = await db.query.profile.findFirst({
    where: (t, { eq }) => eq(t.id, studentId),
    columns: { yearOfBirth: true },
  })
  return row?.yearOfBirth ?? undefined
}

/** Chapters a student actually sees in the track — published and not archived. These are the ones a result is applied to. */
export async function findGradableChapterIds(db: SchoolDb, trackId: string): Promise<string[]> {
  const rows = await db
    .select({ id: chapter.id })
    .from(chapter)
    .where(
      and(eq(chapter.trackId, trackId), eq(chapter.status, 'published'), eq(chapter.archived, false)),
    )
  return rows.map(row => row.id)
}

export async function insert(db: SchoolDb, data: CreateExamData & { batchId: string }): Promise<Exam | undefined> {
  const rows = await db.insert(exam).values(data).returning()
  return rows.at(0)
}

/**
 * Optimistic compare-and-set: only applies `data` if the exam's status still matches
 * `expectedStatus`. Returns `undefined` on a lost race (concurrent status change) as well as on
 * a missing exam — the service distinguishes those two cases with a follow-up read.
 */
export async function updateGuarded(
  db: SchoolDb,
  id: string,
  data: UpdateExamData,
  expectedStatus: Exam['status'],
): Promise<Exam | undefined> {
  const rows = await db
    .update(exam)
    .set(data)
    .where(and(eq(exam.id, id), eq(exam.status, expectedStatus)))
    .returning()

  return rows.at(0)
}

/**
 * Moves the exam to `completed`, guarded by a compare-and-set on `expectedStatus` (the status the
 * service read before opening the transaction). A concurrent second result — which finds the exam
 * already `completed` — and a concurrent status change (e.g. a committed cancellation) both lose
 * here instead of being silently overwritten. Returns `undefined` for a missing exam and for a
 * lost race; the service distinguishes them with a follow-up read.
 */
export async function complete(
  db: SchoolDb,
  id: string,
  expectedStatus: Exam['status'],
): Promise<Exam | undefined> {
  const rows = await db
    .update(exam)
    .set({ status: 'completed' })
    .where(and(eq(exam.id, id), eq(exam.status, expectedStatus)))
    .returning()

  return rows.at(0)
}

export async function insertResult(
  db: SchoolDb,
  values: typeof examResult.$inferInsert,
): Promise<ExamResultRow | undefined> {
  const rows = await db.insert(examResult).values(values).returning()
  return rows.at(0)
}

/** One statement for the whole track — a track has dozens of chapters, so this must never loop. */
export async function insertEvaluations(
  db: SchoolDb,
  rows: (typeof evaluation.$inferInsert)[],
): Promise<void> {
  if (rows.length === 0) {
    return
  }

  await db.insert(evaluation).values(rows)
}
