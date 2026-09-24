import { afterEach, describe, expect, it } from 'vitest'

import { evaluation, type SchoolDbClient } from '@narada/db'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createChapter,
  createProfile,
  createTestSchool,
  createTrack,
  enroll,
  type ChapterRow,
  type EvaluationRow,
  type ProfileRow,
  type TestWorld,
} from '../testing/fixtures'
import { findForBatch, findForStudentInBatch } from './repository'
import { createEvaluations } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

/** Inserts an evaluation with an explicit `evaluatedAt` (including `null`) — the fixtures helper always defaults it via the column's `defaultNow()`, which these pagination tests need to override. */
async function insertEvaluation(
  db: SchoolDbClient,
  o: { student: ProfileRow; chapter: ChapterRow; evaluator: ProfileRow; evaluatedAt: Date | null },
): Promise<EvaluationRow> {
  const rows = await db
    .insert(evaluation)
    .values({
      studentId: o.student.id,
      chapterId: o.chapter.id,
      evaluatorId: o.evaluator.id,
      level: 'level1',
      evaluatedAt: o.evaluatedAt,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('insertEvaluation: insert returned no row')
  return row
}

describe('findForBatch / findForStudentInBatch pagination (§10.2 compound cursor)', () => {
  it('orders non-null evaluatedAt desc, then null-evaluatedAt evaluations last by id desc, across pages', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })
    const batchRow = await createBatch(world, trackRow)
    const studentProfile = await createProfile(world)
    const evaluatorProfile = await createProfile(world)
    await enroll(world, studentProfile, batchRow, 'student')

    const d1 = new Date('2024-01-01T00:00:00Z')
    const d2 = new Date('2024-02-01T00:00:00Z')
    const d3 = new Date('2024-03-01T00:00:00Z')

    const e1 = await insertEvaluation(world.schoolDb, {
      student: studentProfile,
      chapter: chapterRow,
      evaluator: evaluatorProfile,
      evaluatedAt: d1,
    })
    const e2 = await insertEvaluation(world.schoolDb, {
      student: studentProfile,
      chapter: chapterRow,
      evaluator: evaluatorProfile,
      evaluatedAt: d2,
    })
    const e3 = await insertEvaluation(world.schoolDb, {
      student: studentProfile,
      chapter: chapterRow,
      evaluator: evaluatorProfile,
      evaluatedAt: d3,
    })
    const nulls = (
      await Promise.all([
        insertEvaluation(world.schoolDb, {
          student: studentProfile,
          chapter: chapterRow,
          evaluator: evaluatorProfile,
          evaluatedAt: null,
        }),
        insertEvaluation(world.schoolDb, {
          student: studentProfile,
          chapter: chapterRow,
          evaluator: evaluatorProfile,
          evaluatedAt: null,
        }),
      ])
    ).sort((a, b) => (a.id > b.id ? -1 : 1)) // id DESCENDING tie-break, unlike batches' ascending

    const page1 = await findForBatch(world.schoolDb, batchRow.id, trackRow.id, { limit: 2 })
    expect(page1.items.map(e => e.id)).toEqual([e3.id, e2.id])
    expect(page1.nextCursor).not.toBeNull()

    const page2 = await findForBatch(world.schoolDb, batchRow.id, trackRow.id, {
      limit: 2,
      cursor: { evaluatedAt: d2, id: e2.id },
    })
    expect(page2.items.map(e => e.id)).toEqual([e1.id, nulls[0]!.id])
    expect(page2.nextCursor).not.toBeNull()

    const page3 = await findForBatch(world.schoolDb, batchRow.id, trackRow.id, {
      limit: 2,
      cursor: { evaluatedAt: null, id: nulls[0]!.id },
    })
    expect(page3.items.map(e => e.id)).toEqual([nulls[1]!.id])
    expect(page3.nextCursor).toBeNull()
  })

  it('findForStudentInBatch restricts to just the one student', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })
    const batchRow = await createBatch(world, trackRow)
    const studentA = await createProfile(world)
    const studentB = await createProfile(world)
    const evaluatorProfile = await createProfile(world)
    await enroll(world, studentA, batchRow, 'student')
    await enroll(world, studentB, batchRow, 'student')

    const evalA = await insertEvaluation(world.schoolDb, {
      student: studentA,
      chapter: chapterRow,
      evaluator: evaluatorProfile,
      evaluatedAt: new Date(),
    })
    await insertEvaluation(world.schoolDb, {
      student: studentB,
      chapter: chapterRow,
      evaluator: evaluatorProfile,
      evaluatedAt: new Date(),
    })

    const page = await findForStudentInBatch(world.schoolDb, batchRow.id, trackRow.id, studentA.id, {
      limit: 20,
    })

    expect(page.items.map(e => e.id)).toEqual([evalA.id])
  })

  it('returns an empty page when the batch track has no chapters, with no separate empty-list guard needed', async () => {
    world = await createTestSchool()
    const emptyTrack = await createTrack(world)
    const batchRow = await createBatch(world, emptyTrack)

    const page = await findForBatch(world.schoolDb, batchRow.id, emptyTrack.id, { limit: 20 })

    expect(page.items).toEqual([])
    expect(page.nextCursor).toBeNull()
  })
})

describe('a class TA is one of the class\'s learners', () => {
  it('can be graded in their own batch, like a student', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })
    const batchRow = await createBatch(world, trackRow)
    const teacher = await createProfile(world)
    const ta = await createProfile(world)
    await enroll(world, teacher, batchRow, 'instructor')
    await enroll(world, ta, batchRow, 'ta')

    const created = await createEvaluations({ db: world.schoolDb }, batchRow.id, teacher.id, [
      { studentId: ta.id, chapterId: chapterRow.id, level: 'level2' },
    ])

    expect(created).toMatchObject([{ studentId: ta.id, chapterId: chapterRow.id, level: 'level2' }])
  })

  it('still refuses to grade a teacher, who is not a learner in the class', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })
    const batchRow = await createBatch(world, trackRow)
    const teacher = await createProfile(world)
    await enroll(world, teacher, batchRow, 'instructor')

    await expect(
      createEvaluations({ db: world.schoolDb }, batchRow.id, teacher.id, [
        { studentId: teacher.id, chapterId: chapterRow.id, level: 'level2' },
      ]),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})
