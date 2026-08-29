import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { track } from '@narada/db'

import * as examRepository from '../exams/repository'
import { destroyTestWorld } from '../testing/cleanup'
import { pgErrorCode } from '../testing/concurrency'
import { createBatch, createChapter, createProfile, createTestSchool, createTrack, enroll, type TestWorld } from '../testing/fixtures'
import { findAccessible, findByIdWithMembers } from './repository'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('exam foreign-key integrity (matrix item 8)', () => {
  it('raises a 23503 for an exam referencing a nonexistent chapterId', async () => {
    world = await createTestSchool()
    const studentProfile = await createProfile(world)
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)

    await expect(
      examRepository.insert(world.schoolDb, {
        chapterId: crypto.randomUUID(),
        studentId: studentProfile.id,
        scheduledAt: new Date(),
        batchId: batchRow.id,
      }),
    ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')
  })

  it('raises a 23503 for an exam referencing a nonexistent studentId', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow)
    const batchRow = await createBatch(world, trackRow)

    await expect(
      examRepository.insert(world.schoolDb, {
        chapterId: chapterRow.id,
        studentId: crypto.randomUUID(),
        scheduledAt: new Date(),
        batchId: batchRow.id,
      }),
    ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')
  })
})

describe('track deletion constraint behavior (matrix item 9)', () => {
  it('cascades: deleting a track deletes its chapters too (chapter.trackId is onDelete: cascade)', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow)

    await world.schoolDb.delete(track).where(eq(track.id, trackRow.id))

    const stillThere = await world.schoolDb.query.chapter.findFirst({
      where: (t, { eq: eqCol }) => eqCol(t.id, chapterRow.id),
    })
    expect(stillThere).toBeUndefined()
  })

  it(
    'restricts: deleting a track still referenced by a batch raises a 23503 ' +
      "(batch.trackId has no onDelete action, i.e. restrict)",
    async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      await createBatch(world, trackRow)

      await expect(
        world.schoolDb.delete(track).where(eq(track.id, trackRow.id)),
      ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')

      const stillThere = await world.schoolDb.query.track.findFirst({
        where: (t, { eq: eqCol }) => eqCol(t.id, trackRow.id),
      })
      expect(stillThere).toBeDefined()
    },
  )

  it(
    'the restrict from a batch reference blocks the whole statement even when a cascadable ' +
      'chapter reference is also present — the chapter is not deleted either (atomic statement)',
    async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const chapterRow = await createChapter(world, trackRow)
      await createBatch(world, trackRow)

      await expect(
        world.schoolDb.delete(track).where(eq(track.id, trackRow.id)),
      ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')

      const chapterStillThere = await world.schoolDb.query.chapter.findFirst({
        where: (t, { eq: eqCol }) => eqCol(t.id, chapterRow.id),
      })
      expect(chapterStillThere).toBeDefined()
    },
  )
})

describe('findAccessible pagination (§3.4/§9.1 compound cursor)', () => {
  it('orders non-null startDate desc, then null-startDate batches last by id asc, across pages', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)

    const d1 = new Date('2024-01-01T00:00:00Z')
    const d2 = new Date('2024-02-01T00:00:00Z')
    const d3 = new Date('2024-03-01T00:00:00Z')

    const b1 = await createBatch(world, trackRow, { startDate: d1 })
    const b2 = await createBatch(world, trackRow, { startDate: d2 })
    const b3 = await createBatch(world, trackRow, { startDate: d3 })
    const nulls = [
      await createBatch(world, trackRow, { startDate: null }),
      await createBatch(world, trackRow, { startDate: null }),
    ].sort((a, b) => (a.id < b.id ? -1 : 1))

    const page1 = await findAccessible(
      world.schoolDb,
      { limit: 2, status: undefined, cursor: undefined },
      { kind: 'all' },
    )
    expect(page1.items.map(b => b.id)).toEqual([b3.id, b2.id])
    expect(page1.nextCursor).not.toBeNull()

    const page2 = await findAccessible(
      world.schoolDb,
      { limit: 2, status: undefined, cursor: { startDate: d2, id: b2.id } },
      { kind: 'all' },
    )
    expect(page2.items.map(b => b.id)).toEqual([b1.id, nulls[0]!.id])
    expect(page2.nextCursor).not.toBeNull()

    const page3 = await findAccessible(
      world.schoolDb,
      { limit: 2, status: undefined, cursor: { startDate: null, id: nulls[0]!.id } },
      { kind: 'all' },
    )
    expect(page3.items.map(b => b.id)).toEqual([nulls[1]!.id])
    expect(page3.nextCursor).toBeNull()
  })

  it('ties on startDate break by id ascending', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const tiedDate = new Date('2024-05-01T00:00:00Z')

    const created = await Promise.all([
      createBatch(world, trackRow, { startDate: tiedDate }),
      createBatch(world, trackRow, { startDate: tiedDate }),
      createBatch(world, trackRow, { startDate: tiedDate }),
    ])
    const sorted = [...created].sort((a, b) => (a.id < b.id ? -1 : 1))

    const page = await findAccessible(
      world.schoolDb,
      { limit: 100, status: undefined, cursor: undefined },
      { kind: 'all' },
    )

    expect(page.items.map(b => b.id)).toEqual(sorted.map(b => b.id))
  })

  it('an "enrolled" scope only returns batches the given profile is enrolled in', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const enrolledBatch = await createBatch(world, trackRow)
    await createBatch(world, trackRow) // not enrolled — must not appear
    const studentProfile = await createProfile(world)
    await enroll(world, studentProfile, enrolledBatch, 'student')

    const page = await findAccessible(
      world.schoolDb,
      { limit: 100, status: undefined, cursor: undefined },
      { kind: 'enrolled', profileId: studentProfile.id },
    )

    expect(page.items.map(b => b.id)).toEqual([enrolledBatch.id])
  })
})

describe('findByIdWithMembers (batch detail with roster)', () => {
  it('returns the batch with every enrolled member, including name/phone/city/role/joinedAt', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const instructorProfile = await createProfile(world, { name: 'Ada Instructor', phone: '555-0100' })
    const studentProfile = await createProfile(world, { name: 'Bea Student', city: 'Metropolis' })
    await enroll(world, instructorProfile, batchRow, 'instructor')
    await enroll(world, studentProfile, batchRow, 'student')

    const detail = await findByIdWithMembers(world.schoolDb, batchRow.id)

    expect(detail?.id).toBe(batchRow.id)
    expect(detail?.members).toHaveLength(2)
    expect(detail?.members).toContainEqual(
      expect.objectContaining({
        profileId: instructorProfile.id,
        name: 'Ada Instructor',
        phone: '555-0100',
        city: null,
        role: 'instructor',
      }),
    )
    expect(detail?.members).toContainEqual(
      expect.objectContaining({
        profileId: studentProfile.id,
        name: 'Bea Student',
        phone: null,
        city: 'Metropolis',
        role: 'student',
      }),
    )
  })

  it('returns an empty roster, not an error, for a batch with no members', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)

    const detail = await findByIdWithMembers(world.schoolDb, batchRow.id)

    expect(detail?.members).toEqual([])
  })

  it('returns undefined for a nonexistent batch', async () => {
    world = await createTestSchool()

    await expect(findByIdWithMembers(world.schoolDb, crypto.randomUUID())).resolves.toBeUndefined()
  })
})
