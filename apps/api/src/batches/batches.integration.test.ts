import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { track } from '@narada/db'

import * as examRepository from '../exams/repository'
import { destroyTestWorld } from '../testing/cleanup'
import { pgErrorCode } from '../testing/concurrency'
import { createBatch, createChapter, createProfile, createTestSchool, createTrack, enroll, type TestWorld } from '../testing/fixtures'
import { parse } from '../utils/validate'
import {
  deleteClassSlots,
  findAccessible,
  findAccessibleWithDetail,
  findByIdWithMembers,
  insertClassSlots,
} from './repository'
import { UpdateBatchSchema } from './schema'
import { closeEnrollment, findOpenBatches, openEnrollment, setClassSlots, updateBatch } from './service'

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

  it('eager-loads the recurring class schedule alongside the roster', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    await insertClassSlots(world.schoolDb, batchRow.id, [
      { dayOfWeek: 1, time: '09:00', durationMinutes: 60 },
      { dayOfWeek: 3, time: '15:30', durationMinutes: 45 },
    ])

    const detail = await findByIdWithMembers(world.schoolDb, batchRow.id)

    expect(detail?.classSlots).toHaveLength(2)
    expect(detail?.classSlots).toContainEqual({ dayOfWeek: 1, time: '09:00:00', durationMinutes: 60 })
    expect(detail?.classSlots).toContainEqual({ dayOfWeek: 3, time: '15:30:00', durationMinutes: 45 })
  })
})

describe('setClassSlots (PUT /batches/:batchId/schedule — real gap: recurring class schedule)', () => {
  it('throws 404 for a nonexistent batch, without writing anything', async () => {
    world = await createTestSchool()

    await expect(
      setClassSlots({ db: world.schoolDb }, crypto.randomUUID(), {
        slots: [{ dayOfWeek: 1, time: '09:00', durationMinutes: 60 }],
      }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('sets a fresh schedule on a batch with none yet', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)

    const result = await setClassSlots({ db: world.schoolDb }, batchRow.id, {
      slots: [{ dayOfWeek: 2, time: '10:00', durationMinutes: 90 }],
    })

    expect(result).toEqual([{ dayOfWeek: 2, time: '10:00:00', durationMinutes: 90 }])
  })

  it('replaces the entire existing schedule rather than merging with it', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    await insertClassSlots(world.schoolDb, batchRow.id, [
      { dayOfWeek: 1, time: '09:00', durationMinutes: 60 },
      { dayOfWeek: 2, time: '09:00', durationMinutes: 60 },
    ])

    const result = await setClassSlots({ db: world.schoolDb }, batchRow.id, {
      slots: [{ dayOfWeek: 5, time: '18:00', durationMinutes: 30 }],
    })

    expect(result).toEqual([{ dayOfWeek: 5, time: '18:00:00', durationMinutes: 30 }])
    const detail = await findByIdWithMembers(world.schoolDb, batchRow.id)
    expect(detail?.classSlots).toEqual([{ dayOfWeek: 5, time: '18:00:00', durationMinutes: 30 }])
  })

  it('replacing with an empty slot list clears the schedule entirely', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    await insertClassSlots(world.schoolDb, batchRow.id, [
      { dayOfWeek: 1, time: '09:00', durationMinutes: 60 },
    ])

    const result = await setClassSlots({ db: world.schoolDb }, batchRow.id, { slots: [] })

    expect(result).toEqual([])
    const detail = await findByIdWithMembers(world.schoolDb, batchRow.id)
    expect(detail?.classSlots).toEqual([])
  })

  it('setting up to the maximum of seven slots, one per day, all persist', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)

    const slots = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      time: '08:00',
      durationMinutes: 60,
    }))

    const result = await setClassSlots({ db: world.schoolDb }, batchRow.id, { slots })

    expect(result).toHaveLength(7)
  })

  it("replacing one batch's schedule does not touch another batch's schedule", async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchA = await createBatch(world, trackRow)
    const batchB = await createBatch(world, trackRow)
    await insertClassSlots(world.schoolDb, batchA.id, [
      { dayOfWeek: 1, time: '09:00', durationMinutes: 60 },
    ])
    await insertClassSlots(world.schoolDb, batchB.id, [
      { dayOfWeek: 2, time: '11:00', durationMinutes: 60 },
    ])

    await setClassSlots({ db: world.schoolDb }, batchA.id, { slots: [] })

    const detailA = await findByIdWithMembers(world.schoolDb, batchA.id)
    const detailB = await findByIdWithMembers(world.schoolDb, batchB.id)
    expect(detailA?.classSlots).toEqual([])
    expect(detailB?.classSlots).toEqual([{ dayOfWeek: 2, time: '11:00:00', durationMinutes: 60 }])
  })

  it(
    'the database enforces one slot per day per batch independently of the schema-level check ' +
      '(batchClassSlot_batchId_dayOfWeek_uidx) — raises 23505 for a direct duplicate-day insert',
    async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const batchRow = await createBatch(world, trackRow)

      await expect(
        insertClassSlots(world.schoolDb, batchRow.id, [
          { dayOfWeek: 1, time: '09:00', durationMinutes: 60 },
          { dayOfWeek: 1, time: '15:00', durationMinutes: 30 },
        ]),
      ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23505')
    },
  )

  it('a failed insert rolls back the preceding delete — the old schedule survives', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    await insertClassSlots(world.schoolDb, batchRow.id, [
      { dayOfWeek: 1, time: '09:00', durationMinutes: 60 },
    ])

    // Bypasses the schema-level duplicate-day check to exercise the transaction's rollback path
    // directly: the delete succeeds, then the insert fails on the DB unique constraint, and the
    // whole transaction — including the delete — must roll back together.
    await expect(
      world.schoolDb.transaction(async tx => {
        await deleteClassSlots(tx, batchRow.id)
        await insertClassSlots(tx, batchRow.id, [
          { dayOfWeek: 2, time: '09:00', durationMinutes: 60 },
          { dayOfWeek: 2, time: '10:00', durationMinutes: 60 },
        ])
      }),
    ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23505')

    const detail = await findByIdWithMembers(world.schoolDb, batchRow.id)
    expect(detail?.classSlots).toEqual([{ dayOfWeek: 1, time: '09:00:00', durationMinutes: 60 }])
  })
})

describe(
  'findAccessibleWithDetail (real gap: GET /profiles/:profileId/batches?withDetail=true, ' +
    'found migrating apps/web — admin/page.tsx needs every school batch with roster in one query)',
  () => {
    it("the 'all' scope returns every batch with roster/classSlots, nulling role for a batch the target profile doesn't teach", async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const admin = await createProfile(world, { name: 'Admin' })
      const taughtBatch = await createBatch(world, trackRow)
      const untaughtBatch = await createBatch(world, trackRow)
      const student = await createProfile(world, { name: 'A Student' })
      await enroll(world, admin, taughtBatch, 'instructor')
      await enroll(world, student, taughtBatch, 'student')
      await enroll(world, student, untaughtBatch, 'student')
      await insertClassSlots(world.schoolDb, untaughtBatch.id, [
        { dayOfWeek: 1, time: '09:00', durationMinutes: 60 },
      ])

      const { items } = await findAccessibleWithDetail(
        world.schoolDb,
        { limit: 20, status: undefined, cursor: undefined },
        { kind: 'all' },
        admin.id,
      )

      const taught = items.find(i => i.id === taughtBatch.id)
      const untaught = items.find(i => i.id === untaughtBatch.id)
      expect(taught?.role).toBe('instructor')
      expect(taught?.members).toHaveLength(2)
      expect(untaught?.role).toBeNull()
      expect(untaught?.members).toHaveLength(1)
      expect(untaught?.classSlots).toEqual([{ dayOfWeek: 1, time: '09:00:00', durationMinutes: 60 }])
    })

    it("the 'enrolled' scope only returns the target's own batches, role always non-null", async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const student = await createProfile(world)
      const enrolledBatch = await createBatch(world, trackRow)
      await createBatch(world, trackRow) // not enrolled — must not appear
      await enroll(world, student, enrolledBatch, 'student')

      const { items } = await findAccessibleWithDetail(
        world.schoolDb,
        { limit: 20, status: undefined, cursor: undefined },
        { kind: 'enrolled', profileId: student.id },
        student.id,
      )

      expect(items.map(i => i.id)).toEqual([enrolledBatch.id])
      expect(items[0]?.role).toBe('student')
    })

    it("'all' scope pagination (nulls-last compound cursor) matches the bare findAccessible ordering exactly", async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const admin = await createProfile(world)
      const d1 = new Date('2024-01-01T00:00:00Z')
      const d2 = new Date('2024-02-01T00:00:00Z')
      const b1 = await createBatch(world, trackRow, { startDate: d1 })
      const b2 = await createBatch(world, trackRow, { startDate: d2 })
      const bNull = await createBatch(world, trackRow, { startDate: null })

      const bareOrder = await findAccessible(
        world.schoolDb,
        { limit: 100, status: undefined, cursor: undefined },
        { kind: 'all' },
      )
      const detailOrder = await findAccessibleWithDetail(
        world.schoolDb,
        { limit: 100, status: undefined, cursor: undefined },
        { kind: 'all' },
        admin.id,
      )

      expect(detailOrder.items.map(i => i.id)).toEqual(bareOrder.items.map(i => i.id))
      expect(detailOrder.items.map(i => i.id)).toEqual([b2.id, b1.id, bNull.id])
    })

    it('a page boundary mid-detail-list still yields a usable nextCursor (multi-page, all scope)', async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const admin = await createProfile(world)
      const d1 = new Date('2024-01-01T00:00:00Z')
      const d2 = new Date('2024-02-01T00:00:00Z')
      await createBatch(world, trackRow, { startDate: d1 })
      const b2 = await createBatch(world, trackRow, { startDate: d2 })
      await createBatch(world, trackRow, { startDate: new Date('2024-03-01T00:00:00Z') })

      const page1 = await findAccessibleWithDetail(
        world.schoolDb,
        { limit: 2, status: undefined, cursor: undefined },
        { kind: 'all' },
        admin.id,
      )
      expect(page1.items).toHaveLength(2)
      expect(page1.nextCursor).not.toBeNull()

      // Following the pattern of the `findAccessible pagination` tests above: the cursor is
      // constructed from the known second item's own sort key, rather than round-tripped through
      // the opaque encoding — the encoding itself is `utils/cursor.ts`'s concern, already tested.
      const page2 = await findAccessibleWithDetail(
        world.schoolDb,
        { limit: 2, status: undefined, cursor: { startDate: d2, id: b2.id } },
        { kind: 'all' },
        admin.id,
      )
      expect(page2.items).toHaveLength(1)
      expect(page2.nextCursor).toBeNull()
    })
  },
)

describe('openEnrollment / closeEnrollment (the admin "just open/close it" toggle)', () => {
  it('openEnrollment opens the batch immediately, with no scheduled close, overwriting any prior window', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow, {
      enrollmentOpensAt: new Date(Date.now() + 60 * 60 * 1000),
      enrollmentClosesAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    })

    const before = Date.now()
    const updated = await openEnrollment({ db: world.schoolDb }, batchRow.id)
    const after = Date.now()

    expect(updated.enrollmentClosesAt).toBeNull()
    expect(updated.enrollmentOpensAt).not.toBeNull()
    expect(updated.enrollmentOpensAt!.getTime()).toBeGreaterThanOrEqual(before)
    expect(updated.enrollmentOpensAt!.getTime()).toBeLessThanOrEqual(after)

    const openBatches = await findOpenBatches({ db: world.schoolDb })
    expect(openBatches.map(b => b.id)).toContain(batchRow.id)
  })

  it('closeEnrollment closes an open-ended batch immediately', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow, {
      enrollmentOpensAt: new Date(Date.now() - 60 * 60 * 1000),
      enrollmentClosesAt: null,
    })

    await closeEnrollment({ db: world.schoolDb }, batchRow.id)

    const openBatches = await findOpenBatches({ db: world.schoolDb })
    expect(openBatches.map(b => b.id)).not.toContain(batchRow.id)
  })

  it('openEnrollment throws 404 for a nonexistent batch', async () => {
    world = await createTestSchool()

    await expect(openEnrollment({ db: world.schoolDb }, crypto.randomUUID())).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('updateBatch (real gap: PATCH /batches/:batchId must not accept trackId, §9.4)', () => {
  it("a trackId in the request body never reaches the DB — the batch's real track is unchanged", async () => {
    world = await createTestSchool()
    const originalTrack = await createTrack(world)
    const otherTrack = await createTrack(world)
    const batchRow = await createBatch(world, originalTrack)

    // Mirrors exactly what the route does: parse the request body through the real schema, then
    // hand the (already-stripped) result to the service — not a hand-constructed service call.
    const data = await parse(UpdateBatchSchema, { trackId: otherTrack.id, code: 'renamed' })
    const updated = await updateBatch({ db: world.schoolDb }, batchRow.id, data)

    expect(updated.code).toBe('renamed')
    expect(updated.trackId).toBe(originalTrack.id)
  })
})
