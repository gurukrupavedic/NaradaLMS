import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { batch, track } from '@narada/db'

import * as examRepository from '../exams/repository'
import { destroyTestWorld } from '../testing/cleanup'
import { pgErrorCode } from '../testing/concurrency'
import {
  createBatch,
  createChapter,
  createCourse,
  createProfile,
  createTestSchool,
  createTrack,
  defaultCourseId,
  enroll,
  type TestWorld,
} from '../testing/fixtures'
import { parse } from '../utils/validate'
import {
  deleteClassSlots,
  findAccessible,
  findAccessibleWithDetail,
  insertClassSlots,
} from './repository'
import { CreateBatchSchema } from './schema'
import {
  createBatch as createBatchViaService,
  findClassifiers,
  setClassSlots,
} from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('exam foreign-key integrity (matrix item 8)', () => {
  it('raises a 23503 for an exam referencing a nonexistent trackId', async () => {
    world = await createTestSchool()
    const studentProfile = await createProfile(world)

    await expect(
      examRepository.insert(world.schoolDb, {
        trackId: crypto.randomUUID(),
        studentId: studentProfile.id,
        scheduledAt: new Date(),
      }),
    ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')
  })

  it('raises a 23503 for an exam referencing a nonexistent studentId', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)

    await expect(
      examRepository.insert(world.schoolDb, {
        trackId: trackRow.id,
        studentId: crypto.randomUUID(),
        scheduledAt: new Date(),
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
      await defaultCourseId(world),
    )
    expect(page1.items.map(b => b.id)).toEqual([b3.id, b2.id])
    expect(page1.nextCursor).not.toBeNull()

    const page2 = await findAccessible(
      world.schoolDb,
      { limit: 2, status: undefined, cursor: { startDate: d2, id: b2.id } },
      { kind: 'all' },
      await defaultCourseId(world),
    )
    expect(page2.items.map(b => b.id)).toEqual([b1.id, nulls[0]!.id])
    expect(page2.nextCursor).not.toBeNull()

    const page3 = await findAccessible(
      world.schoolDb,
      { limit: 2, status: undefined, cursor: { startDate: null, id: nulls[0]!.id } },
      { kind: 'all' },
      await defaultCourseId(world),
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
      await defaultCourseId(world),
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
      await defaultCourseId(world),
    )

    expect(page.items.map(b => b.id)).toEqual([enrolledBatch.id])
  })
})

/**
 * One batch with its roster and schedule, through the admin list read `findAccessibleWithDetail` — the
 * same shaping (`toBatchDetail`) that `GET /profiles/:id/batches?withDetail` serves.
 */
async function detailOf(w: TestWorld, batchId: string) {
  const { items } = await findAccessibleWithDetail(
    w.schoolDb,
    { limit: 100 },
    { kind: 'all' },
    crypto.randomUUID(),
    await defaultCourseId(w),
  )
  return items.find(item => item.id === batchId)
}

describe('batch detail with roster (findAccessibleWithDetail)', () => {
  it('returns the batch with every enrolled member, including name/phone/email/city/role/joinedAt', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const instructorProfile = await createProfile(world, {
      name: 'Ada Instructor',
      phone: '555-0100',
      email: 'ada@example.org',
    })
    const studentProfile = await createProfile(world, { name: 'Bea Student', city: 'Metropolis' })
    await enroll(world, instructorProfile, batchRow, 'instructor')
    await enroll(world, studentProfile, batchRow, 'student')

    const detail = await detailOf(world, batchRow.id)

    expect(detail?.id).toBe(batchRow.id)
    expect(detail?.members).toHaveLength(2)
    expect(detail?.members).toContainEqual(
      expect.objectContaining({
        profileId: instructorProfile.id,
        name: 'Ada Instructor',
        phone: '555-0100',
        email: 'ada@example.org',
        city: null,
        role: 'instructor',
      }),
    )
    expect(detail?.members).toContainEqual(
      expect.objectContaining({
        profileId: studentProfile.id,
        name: 'Bea Student',
        phone: null,
        email: null,
        city: 'Metropolis',
        role: 'student',
      }),
    )
  })

  it('lists teachers first, then TAs, then students, each alphabetically', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const people = [
      ['Zed Student', 'student'],
      ['Yara TA', 'ta'],
      ['Xavi Instructor', 'instructor'],
      ['Ann Student', 'student'],
      ['Bo TA', 'ta'],
      ['Cy Instructor', 'instructor'],
    ] as const
    for (const [name, role] of people) {
      await enroll(world, await createProfile(world, { name }), batchRow, role)
    }

    const detail = await detailOf(world, batchRow.id)

    expect(detail?.members.map(m => m.name)).toEqual([
      'Cy Instructor',
      'Xavi Instructor',
      'Bo TA',
      'Yara TA',
      'Ann Student',
      'Zed Student',
    ])
  })

  it('returns an empty roster, not an error, for a batch with no members', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)

    const detail = await detailOf(world, batchRow.id)

    expect(detail?.members).toEqual([])
  })

  it('eager-loads the recurring class schedule alongside the roster', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    await insertClassSlots(world.schoolDb, batchRow.id, [
      { dayOfWeek: 1, time: '09:00', durationMinutes: 60 },
      { dayOfWeek: 3, time: '15:30', durationMinutes: 45 },
    ])

    const detail = await detailOf(world, batchRow.id)

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
    const detail = await detailOf(world, batchRow.id)
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
    const detail = await detailOf(world, batchRow.id)
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

    const detailA = await detailOf(world, batchA.id)
    const detailB = await detailOf(world, batchB.id)
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

    const detail = await detailOf(world, batchRow.id)
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
      // A different student in the other batch: one student can't hold an active seat in two batches of a course.
      const otherStudent = await createProfile(world, { name: 'Another Student' })
      await enroll(world, admin, taughtBatch, 'instructor')
      await enroll(world, student, taughtBatch, 'student')
      await enroll(world, otherStudent, untaughtBatch, 'student')
      await insertClassSlots(world.schoolDb, untaughtBatch.id, [
        { dayOfWeek: 1, time: '09:00', durationMinutes: 60 },
      ])

      const { items } = await findAccessibleWithDetail(
        world.schoolDb,
        { limit: 20, status: undefined, cursor: undefined },
        { kind: 'all' },
        admin.id,
        await defaultCourseId(world),
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
        await defaultCourseId(world),
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
        await defaultCourseId(world),
      )
      const detailOrder = await findAccessibleWithDetail(
        world.schoolDb,
        { limit: 100, status: undefined, cursor: undefined },
        { kind: 'all' },
        admin.id,
        await defaultCourseId(world),
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
        await defaultCourseId(world),
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
        await defaultCourseId(world),
      )
      expect(page2.items).toHaveLength(1)
      expect(page2.nextCursor).toBeNull()
    })
  },
)

describe('createBatch generates the code (real gap: manual code entry replaced)', () => {
  const YEAR = new Date().getUTCFullYear()

  // Mirrors exactly what the route does: parse the request body through the real schema (so the
  // classifier's uppercase transform actually runs), then hand the result to the service — not a
  // hand-constructed service call.
  async function create(w: TestWorld, trackId: string, classifier: string, courseSlug: string) {
    const teacher = await createProfile(w)
    const data = await parse(CreateBatchSchema, { trackId, classifier, instructorIds: [teacher.id] })
    return createBatchViaService({ db: w.schoolDb }, data, courseSlug)
  }

  it('builds <COURSE>-<year>-<CLASSIFIER>-<track order>-<index>, uppercasing the classifier', async () => {
    world = await createTestSchool()
    const course = await createCourse(world, { slug: 'ved' })
    const track = await createTrack(world, { course, order: 3 })

    const batch = await create(world, track.id, 'br', course.slug)

    expect(batch.code).toBe(`VED-${YEAR}-BR-3-1`)
  })

  it('seats the named teachers as instructors of the new batch, and creates nothing when one is unknown', async () => {
    world = await createTestSchool()
    const course = await createCourse(world, { slug: 'ved' })
    const track = await createTrack(world, { course, order: 1 })
    const ada = await createProfile(world, { name: 'Ada' })
    const bea = await createProfile(world, { name: 'Bea' })

    const data = await parse(CreateBatchSchema, { trackId: track.id, classifier: 'CH', instructorIds: [ada.id, bea.id] })
    const batch = await createBatchViaService({ db: world.schoolDb }, data, course.slug)

    const seats = await world.schoolDb.query.enrollment.findMany({ where: (t, { eq }) => eq(t.batchId, batch.id) })
    expect(seats.map(s => [s.profileId, s.role]).sort()).toEqual(
      [[ada.id, 'instructor'], [bea.id, 'instructor']].sort(),
    )

    const unknown = await parse(CreateBatchSchema, { trackId: track.id, classifier: 'GR', instructorIds: [crypto.randomUUID()] })
    await expect(createBatchViaService({ db: world.schoolDb }, unknown, course.slug)).rejects.toMatchObject({ statusCode: 422 })
    const all = await world.schoolDb.query.batch.findMany()
    expect(all).toHaveLength(1)
  })

  it('auto-increments the index for a second batch with the same course/year/classifier/track', async () => {
    world = await createTestSchool()
    const course = await createCourse(world, { slug: 'ved' })
    const track = await createTrack(world, { course, order: 1 })

    const first = await create(world, track.id, 'CH', course.slug)
    const second = await create(world, track.id, 'CH', course.slug)

    expect(first.code).toBe(`VED-${YEAR}-CH-1-1`)
    expect(second.code).toBe(`VED-${YEAR}-CH-1-2`)
  })

  it('keeps a separate index sequence per classifier and per track', async () => {
    world = await createTestSchool()
    const course = await createCourse(world, { slug: 'ved' })
    const track1 = await createTrack(world, { course, order: 1 })
    const track2 = await createTrack(world, { course, order: 2 })

    const chOnTrack1 = await create(world, track1.id, 'CH', course.slug)
    const remOnTrack1 = await create(world, track1.id, 'REM', course.slug)
    const chOnTrack2 = await create(world, track2.id, 'CH', course.slug)

    expect(chOnTrack1.code).toBe(`VED-${YEAR}-CH-1-1`)
    expect(remOnTrack1.code).toBe(`VED-${YEAR}-REM-1-1`)
    expect(chOnTrack2.code).toBe(`VED-${YEAR}-CH-2-1`)
  })

  it('generates a fresh, non-colliding index even when an earlier one was hand-edited to a higher number', async () => {
    world = await createTestSchool()
    const course = await createCourse(world, { slug: 'ved' })
    const track = await createTrack(world, { course, order: 1 })
    const first = await create(world, track.id, 'CH', course.slug)
    await world.schoolDb.update(batch).set({ code: `VED-${YEAR}-CH-1-9` }).where(eq(batch.id, first.id))

    const second = await create(world, track.id, 'CH', course.slug)

    expect(second.code).toBe(`VED-${YEAR}-CH-1-10`)
  })

  it('422s for a track that does not exist, without inserting a batch', async () => {
    world = await createTestSchool()
    const course = await createCourse(world, { slug: 'ved' })

    await expect(create(world, crypto.randomUUID(), 'CH', course.slug)).rejects.toMatchObject({
      statusCode: 422,
    })
  })
})

describe('findClassifiers (real gap: create-batch form dropdown)', () => {
  it('lists distinct classifiers already used in this course, excluding a bare track number', async () => {
    world = await createTestSchool()
    const course = await createCourse(world, { slug: 'ved' })
    const track = await createTrack(world, { course, order: 1 })
    const teacher = await createProfile(world)
    const data = (classifier: string) =>
      parse(CreateBatchSchema, { trackId: track.id, classifier, instructorIds: [teacher.id] })
    await createBatchViaService({ db: world.schoolDb }, await data('CH'), course.slug)
    await createBatchViaService({ db: world.schoolDb }, await data('CH'), course.slug)
    await createBatchViaService({ db: world.schoolDb }, await data('GR'), course.slug)
    // A legacy-style code with no classifier segment at all (<COURSE>-<year>-<track>-<index>) —
    // must not surface "1" (the track order) as if it were a real classifier.
    await createBatch(world, track, { code: `VED-${new Date().getUTCFullYear()}-1-5` })

    const classifiers = await findClassifiers({ db: world.schoolDb }, course.id)

    expect(classifiers).toEqual(['CH', 'GR'])
  })

  it('returns an empty list for a course with no batches yet', async () => {
    world = await createTestSchool()
    const course = await createCourse(world, { slug: 'ved' })

    await expect(findClassifiers({ db: world.schoolDb }, course.id)).resolves.toEqual([])
  })
})
