import type { SchoolDb, SchoolDbClient } from '@narada/db'

import { notFound, orInternalError, orNotFound } from '../error'
import type { AccessPolicy } from '../utils/accessPolicy'
import { occurrencesAfter } from './occurrences'
import * as repository from './repository'
import type { ExamSchedule, ExamScheduleData, UpdateExamScheduleResult } from './schema'

type Context = { db: SchoolDbClient }
type AdminContext = Context & { access: AccessPolicy }

export async function findAll(context: AdminContext, courseId: string): Promise<ExamSchedule[]> {
  context.access.requireCanCreateExam()
  return repository.findAll(context.db, courseId)
}

/** Opens `schedule`'s rolling window of slots. Idempotent — safe to call as often as needed. */
async function generate(db: SchoolDb, schedule: ExamSchedule, now: Date): Promise<void> {
  await repository.insertGeneratedSlots(db, schedule, occurrencesAfter(schedule, now))
}

/**
 * Tops up every schedule in `courseId` to the full horizon. There's no background job runner in
 * this API, so slots are kept populated lazily: on every schedule change, and whenever slots are
 * listed (`examSlots/route.ts`). Idempotent by construction (see `insertGeneratedSlots`), so
 * concurrent callers and repeated calls are harmless.
 */
export async function ensureHorizon(context: Context, courseId: string, now = new Date()): Promise<void> {
  for (const schedule of await repository.findAll(context.db, courseId)) {
    await generate(context.db, schedule, now)
  }
}

export async function create(
  context: AdminContext,
  data: ExamScheduleData,
  createdBy: string,
  courseId: string,
): Promise<ExamSchedule> {
  context.access.requireCanCreateExam()

  return context.db.transaction(async tx => {
    const schedule = orInternalError(await repository.insert(tx, { ...data, courseId, createdBy }))
    await generate(tx, schedule, new Date())
    return schedule
  })
}

async function findInCourse(context: Context, id: string, courseId: string): Promise<ExamSchedule> {
  const schedule = orNotFound(await repository.findById(context.db, id))
  if (schedule.courseId !== courseId) throw notFound()
  return schedule
}

/**
 * Replaces the rule and rebuilds its future slots. Only unclaimed (`open`) slots are rebuilt: a
 * `requested` or `booked` slot has a student committed to its time, so it stays where it is, and the
 * result reports how many of those no longer fit the new rule so the admin can follow up.
 */
export async function update(
  context: AdminContext,
  id: string,
  data: ExamScheduleData,
  courseId: string,
): Promise<UpdateExamScheduleResult> {
  context.access.requireCanCreateExam()
  await findInCourse(context, id, courseId)

  const now = new Date()
  return context.db.transaction(async tx => {
    const schedule = orInternalError(await repository.update(tx, id, data))
    await repository.deleteFutureOpenSlots(tx, id, now)
    await generate(tx, schedule, now)

    const onGrid = new Set(occurrencesAfter(schedule, now).map(d => d.getTime()))
    const committed = await repository.findFutureCommittedTimes(tx, id, now)
    return { schedule, keptSlots: committed.filter(d => !onGrid.has(d.getTime())).length }
  })
}

/**
 * Deletes the rule and its unclaimed future slots. Slots a student has claimed or booked survive as
 * one-offs (`examSlot.scheduleId` is set null by the database), as do past and cancelled ones.
 */
export async function remove(context: AdminContext, id: string, courseId: string): Promise<void> {
  context.access.requireCanCreateExam()
  await findInCourse(context, id, courseId)

  await context.db.transaction(async tx => {
    await repository.deleteFutureOpenSlots(tx, id, new Date())
    await repository.remove(tx, id)
  })
}
