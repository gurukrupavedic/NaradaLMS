import { and, asc, desc, eq, inArray, type SQL } from 'drizzle-orm'

import { examSlot, examSlotRequest, track, type SchoolDb } from '@narada/db'

import type { ExamSlotRequestReadScope } from '../utils/accessPolicy'
import { paginateResponse } from '../utils/cursor'
import { keysetAfter } from '../utils/keyset'
import type {
  ExamSlot,
  ExamSlotRequest,
  ExamSlotRequestWithDetail,
  ExamSlotWithDetail,
  FindExamSlotRequestsData,
  FindExamSlotsData,
  OpenExamSlotData,
} from './schema'

// A slot (and, through it, a request) belongs to a course through its track.
function tracksOfCourse(db: SchoolDb, courseId: string) {
  return db.select({ id: track.id }).from(track).where(eq(track.courseId, courseId))
}

const SLOT_DETAIL = { track: { columns: { name: true } } } as const

function toSlotDetail<Row extends { track: { name: string } }>(
  row: Row,
): Omit<Row, 'track'> & { trackName: string } {
  const { track: trackRow, ...rest } = row
  return { ...rest, trackName: trackRow.name }
}

const REQUEST_DETAIL = {
  track: { columns: { name: true } },
  student: { columns: { name: true } },
  slot: { columns: { scheduledAt: true } },
} as const

function toRequestDetail<
  Row extends { track: { name: string }; student: { name: string }; slot: { scheduledAt: Date } },
>(row: Row): Omit<Row, 'track' | 'student' | 'slot'> & {
  trackName: string
  studentName: string
  slotScheduledAt: Date
} {
  const { track: trackRow, student: studentRow, slot: slotRow, ...rest } = row
  return {
    ...rest,
    trackName: trackRow.name,
    studentName: studentRow.name,
    slotScheduledAt: slotRow.scheduledAt,
  }
}

/**
 * Lists slots visible in `courseId`, soonest-first with a matching compound cursor — the same
 * shape as `exams/repository.ts::findMany`. Eager-loads the track's name (§0.4-style
 * list-detail equivalence): a bare `ExamSlot` row has only a `trackId`, not enough to render in a
 * list that isn't already narrowed to one track.
 */
export async function findManySlots(
  db: SchoolDb,
  { trackId, status, cursor, limit }: FindExamSlotsData,
  courseId: string,
): Promise<{ items: ExamSlotWithDetail[]; nextCursor: string | null }> {
  const conditions: SQL[] = [inArray(examSlot.trackId, tracksOfCourse(db, courseId))]

  if (trackId) {
    conditions.push(eq(examSlot.trackId, trackId))
  }

  if (status) {
    conditions.push(eq(examSlot.status, status))
  }

  if (cursor) {
    conditions.push(
      keysetAfter(
        examSlot.scheduledAt,
        examSlot.id,
        { sortValue: cursor.scheduledAt, id: cursor.id },
        { sort: 'asc', id: 'asc' },
      ),
    )
  }

  const rows = await db.query.examSlot.findMany({
    where: and(...conditions),
    orderBy: [asc(examSlot.scheduledAt), asc(examSlot.id)],
    limit: limit + 1,
    with: SLOT_DETAIL,
  })

  const page = paginateResponse(rows, limit, item => ({ scheduledAt: item.scheduledAt, id: item.id }))
  return { items: page.items.map(toSlotDetail), nextCursor: page.nextCursor }
}

export async function findSlotById(db: SchoolDb, id: string): Promise<ExamSlot | undefined> {
  return db.query.examSlot.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, id),
  })
}

/** The `GET /exam-slots/:examSlotId` read path — list-detail equivalence, not a separate, thinner shape. */
export async function findSlotByIdWithDetail(db: SchoolDb, id: string): Promise<ExamSlotWithDetail | undefined> {
  const row = await db.query.examSlot.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, id),
    with: SLOT_DETAIL,
  })
  return row && toSlotDetail(row)
}

/**
 * Lists requests visible under `scope` — an admin sees every one in `courseId`, a student only
 * their own — newest-first with a matching compound cursor, mirroring
 * `enrollmentRequests/repository.ts::findAll`. Eager-loads the track name, the student's name, and
 * the slot's own scheduled time: an admin's review queue needs to know who's asking for what, when,
 * without a second round-trip per row.
 */
export async function findManyRequests(
  db: SchoolDb,
  { status, cursor, limit }: FindExamSlotRequestsData,
  scope: ExamSlotRequestReadScope,
  courseId: string,
): Promise<{ items: ExamSlotRequestWithDetail[]; nextCursor: string | null }> {
  const conditions: SQL[] = [inArray(examSlotRequest.trackId, tracksOfCourse(db, courseId))]

  if (scope.kind === 'own') {
    conditions.push(eq(examSlotRequest.studentId, scope.profileId))
  }

  if (status) {
    conditions.push(eq(examSlotRequest.status, status))
  }

  if (cursor) {
    conditions.push(
      keysetAfter(
        examSlotRequest.createdAt,
        examSlotRequest.id,
        { sortValue: cursor.createdAt, id: cursor.id },
        { sort: 'desc', id: 'asc' },
      ),
    )
  }

  const rows = await db.query.examSlotRequest.findMany({
    where: and(...conditions),
    orderBy: [desc(examSlotRequest.createdAt), asc(examSlotRequest.id)],
    limit: limit + 1,
    with: REQUEST_DETAIL,
  })

  const page = paginateResponse(rows, limit, item => ({ createdAt: item.createdAt, id: item.id }))
  return { items: page.items.map(toRequestDetail), nextCursor: page.nextCursor }
}

export async function findRequestById(db: SchoolDb, id: string): Promise<ExamSlotRequest | undefined> {
  return db.query.examSlotRequest.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, id),
  })
}

/** The `GET /exam-slots/requests/:examSlotRequestId` read path — list-detail equivalence, not a separate, thinner shape. */
export async function findRequestByIdWithDetail(
  db: SchoolDb,
  id: string,
): Promise<ExamSlotRequestWithDetail | undefined> {
  const row = await db.query.examSlotRequest.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, id),
    with: REQUEST_DETAIL,
  })
  return row && toRequestDetail(row)
}

/** Backs the "one pending request per student per track" friendly precheck in `service.ts::request`
 * — the partial unique index on `(studentId, trackId)` is the real guarantee; this is just its
 * early, clearer-error version (mirrors `enrollmentRequests/repository.ts::findPending`). */
export async function findPendingRequestForStudentTrack(
  db: SchoolDb,
  studentId: string,
  trackId: string,
): Promise<{ id: string } | undefined> {
  return db.query.examSlotRequest.findFirst({
    where: (t, { and: andCols, eq: eqCol }) =>
      andCols(eqCol(t.studentId, studentId), eqCol(t.trackId, trackId), eqCol(t.status, 'pending')),
    columns: { id: true },
  })
}

/** The one pending request (if any) currently holding `slotId` — backs `service.ts::cancelSlot`'s
 * job of rejecting that request when the slot underneath it is withdrawn. At most one can ever
 * exist per slot (`examSlotRequest_one_pending_per_slot_uidx`). */
export async function findPendingRequestForSlot(
  db: SchoolDb,
  slotId: string,
): Promise<{ id: string } | undefined> {
  return db.query.examSlotRequest.findFirst({
    where: (t, { and: andCols, eq: eqCol }) => andCols(eqCol(t.slotId, slotId), eqCol(t.status, 'pending')),
    columns: { id: true },
  })
}

export async function insertSlot(
  db: SchoolDb,
  data: OpenExamSlotData & { openedBy: string },
): Promise<ExamSlot | undefined> {
  const rows = await db.insert(examSlot).values(data).returning()
  return rows.at(0)
}

/**
 * Optimistic compare-and-set on a slot's own status — the same shape as `exams/repository.ts`'s
 * `updateGuarded`/`complete`. Backs every slot-status move `service.ts` makes (claiming it on a
 * request, booking it on approval, freeing it on rejection): `undefined` means either the slot
 * doesn't exist or it's no longer in `expectedStatus`, and the caller distinguishes those with a
 * follow-up read if it needs to.
 */
export async function updateSlotStatusGuarded(
  db: SchoolDb,
  id: string,
  status: ExamSlot['status'],
  expectedStatus: ExamSlot['status'],
): Promise<ExamSlot | undefined> {
  const rows = await db
    .update(examSlot)
    .set({ status })
    .where(and(eq(examSlot.id, id), eq(examSlot.status, expectedStatus)))
    .returning()

  return rows.at(0)
}

export async function insertRequest(
  db: SchoolDb,
  data: { slotId: string; trackId: string; studentId: string },
): Promise<ExamSlotRequest | undefined> {
  const rows = await db.insert(examSlotRequest).values(data).returning()
  return rows.at(0)
}

/** Transitions a still-`pending` request to `status`, recording who reviewed it, when, and (on
 * approval) the real `exam` row it produced — same "double review is a no-op update, not a silent
 * overwrite" shape as `enrollmentRequests/repository.ts::transitionStatus`. */
export async function transitionRequestStatus(
  db: SchoolDb,
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string | null,
  examId: string | null,
): Promise<ExamSlotRequest | undefined> {
  const rows = await db
    .update(examSlotRequest)
    .set({ status, reviewedAt: new Date(), reviewedBy, examId })
    .where(and(eq(examSlotRequest.id, id), eq(examSlotRequest.status, 'pending')))
    .returning()

  return rows.at(0)
}
