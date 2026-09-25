import { and, asc, desc, eq, getTableColumns, inArray, ne, notInArray, or, sql, type SQL } from 'drizzle-orm'

import { chapter, enrollment, evaluation, exam, examResult, profile, track, type SchoolDb } from '@narada/db'

import { tokenMatch } from '../utils/search'
import type { ExamReadScope } from '../utils/accessPolicy'
import { paginateResponse } from '../utils/cursor'
import { keysetAfter } from '../utils/keyset'
import { unprocessable } from '../error'
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

/**
 * What a `GET /exams`-style read eager-loads: the track's name, the result (if any), and the
 * sitting's student — the admin exams screen renders these directly off each exam row rather
 * than cross-referencing a separate (paginated, possibly-incomplete) roster fetch.
 */
const DETAIL = {
  track: { columns: { id: true, name: true, order: true } },
  result: true,
  student: { columns: { id: true, name: true } },
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
  { status, cursor, limit, query, graded, sort }: FindExamsData,
  scope: ExamReadScope,
  courseId: string,
): Promise<{ items: ExamWithDetail[]; nextCursor: string | null }> {
  const conditions: SQL[] = []
  conditions.push(inArray(exam.trackId, tracksOfCourse(db, courseId)))

  if (scope.kind === 'own') {
    conditions.push(eq(exam.studentId, scope.profileId))
  } else if (scope.kind === 'manageable') {
    // `batchIds` is guaranteed non-empty by `AccessPolicy.getExamVisibility` (an empty-permission
    // actor gets 'own' instead), so `inArray` never has to handle a zero-length list here. An
    // instructor/TA sees the sittings of every student enrolled in a batch they teach.
    const studentsInMyBatches = db
      .select({ profileId: enrollment.profileId })
      .from(enrollment)
      .where(inArray(enrollment.batchId, scope.batchIds))
    conditions.push(or(eq(exam.studentId, scope.profileId), inArray(exam.studentId, studentsInMyBatches))!)
  }

  if (status) {
    conditions.push(eq(exam.status, status))
  }

  if (graded !== undefined) {
    const gradedExamIds = db.select({ examId: examResult.examId }).from(examResult)
    conditions.push(
      graded
        ? inArray(exam.id, gradedExamIds)
        : and(notInArray(exam.id, gradedExamIds), ne(exam.status, 'cancelled'))!,
    )
  }

  if (query) {
    // Phones are stored with a leading "+" that a typed query rarely has, so it is ignored.
    const match = tokenMatch(query.replace(/\+/g, ''), [profile.name, profile.email, profile.phone])
    if (match) {
      conditions.push(inArray(exam.studentId, db.select({ id: profile.id }).from(profile).where(match)))
    }
  }

  // `sort=track`: the track's own order, then the student's name, then the exam id. Both leading
  // keys live on other tables, so they are correlated subqueries rather than columns. Written as
  // literal SQL because inside a relational query Drizzle renders every column reference against
  // the root table's alias ("exam"), which would break a subquery over another table.
  const trackOrder = sql`(select t."order" from "track" t where t."id" = "exam"."trackId")`
  const studentName = sql`(select p."name" from "profile" p where p."id" = "exam"."studentId")`

  if (cursor) {
    if (sort === 'track') {
      if (cursor.trackOrder === undefined || cursor.studentName === undefined) {
        throw unprocessable('cursor does not match this sort')
      }
      conditions.push(
        sql`(${trackOrder}, ${studentName}, ${exam.id}) > (${cursor.trackOrder}::int, ${cursor.studentName}::text, ${cursor.id}::uuid)`,
      )
    } else {
      if (cursor.scheduledAt === undefined) {
        throw unprocessable('cursor does not match this sort')
      }
      conditions.push(
        keysetAfter(exam.scheduledAt, exam.id, { sortValue: cursor.scheduledAt, id: cursor.id }, { sort, id: sort }),
      )
    }
  }

  const orderBy =
    sort === 'track'
      ? [asc(trackOrder), asc(studentName), asc(exam.id)]
      : [sort === 'desc' ? desc(exam.scheduledAt) : asc(exam.scheduledAt), sort === 'desc' ? desc(exam.id) : asc(exam.id)]
  const rows = await db.query.exam.findMany({
    where: and(...conditions),
    orderBy,
    limit: limit + 1,
    with: DETAIL,
  })

  const page = paginateResponse(rows, limit, item =>
    sort === 'track'
      ? { trackOrder: item.track.order, studentName: item.student.name, id: item.id }
      : { scheduledAt: item.scheduledAt, id: item.id },
  )
  return { items: page.items.map(toDetail), nextCursor: page.nextCursor }
}

/** Bare exam row — for internal service logic (authorization checks, transition guards) that only ever reads `Exam`'s own columns, never track/result detail. */
export async function findById(db: SchoolDb, id: string): Promise<Exam | undefined> {
  return db.query.exam.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  })
}

/** One exam with the same eager-load as {@link findMany} — list-detail equivalence, not a separate, thinner shape. */
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

/**
 * Whether `studentId` holds at least L1 on `trackId` — any recorded result other than `reappear`
 * (§`grading.ts::levelForOutcome`: everything but `reappear` grants a real level, and the lowest
 * of those is L1). Backs `enrollmentRequests/service.ts::request`'s prerequisite gate: a student
 * may only request the batch after the one for the track before it.
 */
export async function hasPassedTrack(db: SchoolDb, studentId: string, trackId: string): Promise<boolean> {
  const rows = await db
    .select({ examId: examResult.examId })
    .from(examResult)
    .innerJoin(exam, eq(exam.id, examResult.examId))
    .where(and(eq(exam.studentId, studentId), eq(exam.trackId, trackId), ne(examResult.outcome, 'reappear')))
    .limit(1)

  return rows.length > 0
}

/**
 * Every trackId in `courseId` that `studentId` holds at least L1 on — the bulk counterpart to
 * {@link hasPassedTrack}, one query for the whole course instead of one per track (backs
 * `batches/service.ts::findOpenBatches`'s eligibility check across every open batch at once).
 * `SchoolDb` doesn't expose `selectDistinct`, so this dedupes in JS via the `Set` instead — the row
 * count here is bounded by a student's own exam history, never large enough to matter.
 */
export async function findPassedTrackIds(
  db: SchoolDb,
  studentId: string,
  courseId: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ trackId: exam.trackId })
    .from(examResult)
    .innerJoin(exam, eq(exam.id, examResult.examId))
    .where(
      and(
        eq(exam.studentId, studentId),
        ne(examResult.outcome, 'reappear'),
        inArray(exam.trackId, tracksOfCourse(db, courseId)),
      ),
    )

  return new Set(rows.map(row => row.trackId))
}

/**
 * Whether `studentId` has reached L3 (isCertified — level3 or level4) on every gradable chapter of
 * `trackId`, right now — the eligibility gate for requesting a certification-exam slot on this
 * track (`examSlots/service.ts::request`). Not the same question as {@link hasPassedTrack}, which
 * checks a *previous exam result* on this track — this is chapter-level standing, the thing that
 * makes a first sitting requestable in the first place. A track with no gradable chapters is never
 * eligible (vacuously true would let a student "pass" a track that isn't ready to certify at all).
 */
export async function isCertifiedAcrossTrack(
  db: SchoolDb,
  studentId: string,
  trackId: string,
): Promise<boolean> {
  const chapters = await db
    .select({ id: chapter.id, trackId: chapter.trackId })
    .from(chapter)
    .where(gradableChapterOf(eq(chapter.trackId, trackId)))

  return (await eligibleTrackIds(db, studentId, chapters)).has(trackId)
}

/**
 * Every track in `courseId` the student is currently eligible to request a sitting on — the bulk
 * counterpart to {@link isCertifiedAcrossTrack} (same rule, one pair of queries for the whole
 * course instead of one pair per track), backing the exams screen's request-button pre-check.
 */
export async function findEligibleTrackIds(
  db: SchoolDb,
  studentId: string,
  courseId: string,
): Promise<string[]> {
  const chapters = await db
    .select({ id: chapter.id, trackId: chapter.trackId })
    .from(chapter)
    .where(gradableChapterOf(inArray(chapter.trackId, tracksOfCourse(db, courseId))))

  return [...(await eligibleTrackIds(db, studentId, chapters))]
}

// Published and not archived — the chapters a student actually sees, and the ones a result applies to.
function gradableChapterOf(trackFilter: SQL) {
  return and(trackFilter, eq(chapter.status, 'published'), eq(chapter.archived, false))
}

/**
 * The one place the eligibility rule lives: a track qualifies when it has at least one gradable
 * chapter and every one of them is currently L3+. Reduces each chapter's evaluation history to its
 * current level — last write (by `evaluatedAt`) wins, the same reduction the dashboard does
 * client-side over a student's whole course — in JS, since `SchoolDb` doesn't expose a real
 * `DISTINCT ON` (see `findPassedTrackIds`'s own note on this).
 */
async function eligibleTrackIds(
  db: SchoolDb,
  studentId: string,
  chapters: { id: string; trackId: string }[],
): Promise<Set<string>> {
  if (chapters.length === 0) {
    return new Set()
  }

  const rows = await db.query.evaluation.findMany({
    where: (t, { and: andCols, eq: eqCol, inArray: inArrayCol }) =>
      andCols(
        eqCol(t.studentId, studentId),
        inArrayCol(
          t.chapterId,
          chapters.map(c => c.id),
        ),
      ),
    orderBy: (t, { asc: ascCol }) => ascCol(t.evaluatedAt),
    columns: { chapterId: true, level: true },
  })

  const currentLevelByChapter = new Map<string, Evaluation['level']>()
  for (const row of rows) {
    currentLevelByChapter.set(row.chapterId, row.level)
  }

  const eligible = new Set(chapters.map(c => c.trackId))
  for (const c of chapters) {
    const level = currentLevelByChapter.get(c.id)
    if (level !== 'level3' && level !== 'level4') {
      eligible.delete(c.trackId)
    }
  }

  return eligible
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
    .where(gradableChapterOf(eq(chapter.trackId, trackId)))
  return rows.map(row => row.id)
}

export async function insert(db: SchoolDb, data: CreateExamData): Promise<Exam | undefined> {
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

/**
 * Overwrites an already-recorded result in place — `service.ts::correctExamResult`'s admin
 * correction, not a second sitting. `examId` is the table's own primary key, so this is a plain
 * `UPDATE`, not an upsert; `undefined` (no matching row) means there was no result yet to correct,
 * which the service treats as a 404 (record one first, via `insertResult`, not this).
 */
export async function updateResult(
  db: SchoolDb,
  examId: string,
  values: Omit<typeof examResult.$inferInsert, 'examId'>,
): Promise<ExamResultRow | undefined> {
  const rows = await db.update(examResult).set(values).where(eq(examResult.examId, examId)).returning()
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
