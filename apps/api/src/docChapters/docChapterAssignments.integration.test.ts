import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createChapter,
  createCourse,
  createDocChapter,
  createSegment,
  createTestSchool,
  createTrack,
  type TestWorld,
} from '../testing/fixtures'
import { setAssignmentsRequestSchema } from './schema'
import { setAssignments } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('setAssignmentsRequestSchema', () => {
  it('rejects a duplicate segmentId', () => {
    const segmentId = crypto.randomUUID()
    const result = setAssignmentsRequestSchema.safeParse({
      assignments: [
        { segmentId, chapterId: null },
        { segmentId, chapterId: crypto.randomUUID() },
      ],
    })
    expect(result.success).toBe(false)
  })
})

describe('setAssignments (service)', () => {
  it('bulk-assigns segments across chapters and null in one call', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterA = await createChapter(world, trackRow)
    const chapterB = await createChapter(world, trackRow)
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1 })
    const segment2 = await createSegment(world, docChapterRow, { order: 2 })
    const segment3 = await createSegment(world, docChapterRow, { order: 3 })

    const detail = await setAssignments(world.schoolDb, docChapterRow.id, [
      { segmentId: segment1.id, chapterId: chapterA.id },
      { segmentId: segment2.id, chapterId: chapterA.id },
      { segmentId: segment3.id, chapterId: chapterB.id },
    ])

    expect(detail.segments.map(s => s.chapterId)).toEqual([chapterA.id, chapterA.id, chapterB.id])
  })

  it('moving a boundary is just sending a new complete mapping, including unassigning with null', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterA = await createChapter(world, trackRow)
    const chapterB = await createChapter(world, trackRow)
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1, chapter: chapterA })
    const segment2 = await createSegment(world, docChapterRow, { order: 2, chapter: chapterA })

    const detail = await setAssignments(world.schoolDb, docChapterRow.id, [
      { segmentId: segment1.id, chapterId: null },
      { segmentId: segment2.id, chapterId: chapterB.id },
    ])

    expect(detail.segments.map(s => s.chapterId)).toEqual([null, chapterB.id])
  })

  it('rejects a duplicate segmentId even when called directly (bypassing the route\'s zod schema)', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterA = await createChapter(world, trackRow)
    const chapterB = await createChapter(world, trackRow)
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1 })
    const segment2 = await createSegment(world, docChapterRow, { order: 2 })

    await expect(
      setAssignments(world.schoolDb, docChapterRow.id, [
        { segmentId: segment1.id, chapterId: chapterA.id },
        { segmentId: segment1.id, chapterId: chapterB.id },
        { segmentId: segment2.id, chapterId: null },
      ]),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('rejects a mapping missing one of the doc chapter\'s segments', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1 })
    await createSegment(world, docChapterRow, { order: 2 })

    await expect(
      setAssignments(world.schoolDb, docChapterRow.id, [{ segmentId: segment1.id, chapterId: null }]),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('rejects a mapping naming a segment from a different doc chapter', async () => {
    world = await createTestSchool()
    const docChapterA = await createDocChapter(world, { title: 'A' })
    const docChapterB = await createDocChapter(world, { title: 'B' })
    const segmentInA = await createSegment(world, docChapterA, { order: 1 })
    const segmentInB = await createSegment(world, docChapterB, { order: 1 })

    await expect(
      setAssignments(world.schoolDb, docChapterA.id, [
        { segmentId: segmentInA.id, chapterId: null },
        { segmentId: segmentInB.id, chapterId: null },
      ]),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('rejects assigning to a chapter that belongs to a different course', async () => {
    world = await createTestSchool()
    const otherCourse = await createCourse(world)
    const otherTrack = await createTrack(world, { course: otherCourse })
    const chapterInOtherCourse = await createChapter(world, otherTrack)
    // No `course` override — defaults to the same course `defaultCourseId` resolves to.
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1 })

    await expect(
      setAssignments(world.schoolDb, docChapterRow.id, [
        { segmentId: segment1.id, chapterId: chapterInOtherCourse.id },
      ]),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('404s an unknown doc chapter', async () => {
    world = await createTestSchool()
    await expect(setAssignments(world.schoolDb, crypto.randomUUID(), [])).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
