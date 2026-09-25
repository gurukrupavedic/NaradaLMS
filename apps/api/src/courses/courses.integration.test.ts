import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { batch, course, enrollment, track } from '@narada/db'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createCourse,
  createExam,
  createExamResult,
  createProfile,
  createTestSchool,
  createTrack,
  enroll as seat,
  type TestWorld,
} from '../testing/fixtures'
import { createBatch as createBatchViaService } from '../batches/service'
import { enroll, moveEnrollment } from '../enrollment/service'
import { request as requestToJoin } from '../enrollmentRequests/service'
import { resolveCourse } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

// Drizzle wraps the driver's error; the Postgres SQLSTATE and constraint name live on `cause`.
function violation(error: unknown): { code?: string; constraint?: string } {
  const cause = (error as { cause?: { code?: string; constraint?: string } }).cause
  return { code: cause?.code, constraint: cause?.constraint }
}

const ONE_SEAT = 'enrollment_one_active_student_seat_per_course'

/** Vedam with two tracks/batches, plus a second course with its own — enough to tell "same course" from "another course". */
async function seedTwoCourses() {
  const w = await createTestSchool()
  const vedam = await createCourse(w, { slug: 'vedam', name: 'Vedam' })
  const smartam = await createCourse(w, { slug: 'smartam', name: 'Smartam' })
  const vedamTrack1 = await createTrack(w, { course: vedam })
  const vedamTrack2 = await createTrack(w, { course: vedam })
  const smartamTrack = await createTrack(w, { course: smartam })
  const vedamBatch1 = await createBatch(w, vedamTrack1)
  const vedamBatch2 = await createBatch(w, vedamTrack2)
  const smartamBatch = await createBatch(w, smartamTrack)
  return {
    w,
    vedam,
    smartam,
    vedamTrack1,
    vedamTrack2,
    smartamTrack,
    vedamBatch1,
    vedamBatch2,
    smartamBatch,
  }
}

async function activeSeats(w: TestWorld, profileId: string) {
  return w.schoolDb.query.enrollment.findMany({
    where: (t, { and, eq: eqCol }) => and(eqCol(t.profileId, profileId), eqCol(t.status, 'active')),
  })
}

describe('what a course slug may be, in the database', () => {
  const insertCourse = (slug: string) =>
    world!.schoolDb
      .insert(course)
      .values({ slug, name: 'X' })
      .catch((e: unknown) => e)

  it.each(['vedam', 'smartam-2', '2026'])('accepts %s', async slug => {
    world = await createTestSchool()

    expect(await insertCourse(slug)).not.toBeInstanceOf(Error)
  })

  it.each(['Vedam', 've dam', 've/dam', '-vedam', 'vedam-', 've--dam'])(
    'refuses %j — not a lower-case URL segment',
    async slug => {
      world = await createTestSchool()

      expect(violation(await insertCourse(slug))).toEqual({
        code: '23514',
        constraint: 'course_slug_valid',
      })
    },
  )

  it.each(['login', 'register', 'admin', 'dashboard', 'link-device'])(
    'refuses the reserved word %s, which a top-level route already owns',
    async slug => {
      world = await createTestSchool()

      expect(violation(await insertCourse(slug))).toEqual({
        code: '23514',
        constraint: 'course_slug_valid',
      })
    },
  )
})

describe('the one-active-seat-per-course rule, in the database', () => {
  it('lets a student hold an active seat in only one batch of a course', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world)
    await seat(world, student, s.vedamBatch1, 'student')

    const error = await seat(world, student, s.vedamBatch2, 'student').catch((e: unknown) => e)

    expect(violation(error)).toEqual({ code: '23505', constraint: ONE_SEAT })
    expect(await activeSeats(world, student.id)).toHaveLength(1)
  })

  it('lets the same student hold one active seat in each of two courses', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world)

    await seat(world, student, s.vedamBatch1, 'student')
    await seat(world, student, s.smartamBatch, 'student')

    expect(await activeSeats(world, student.id)).toHaveLength(2)
  })

  it('does not limit instructors or TAs — they can teach several batches in a course', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const teacher = await createProfile(world)
    const assistant = await createProfile(world)

    await seat(world, teacher, s.vedamBatch1, 'instructor')
    await seat(world, teacher, s.vedamBatch2, 'instructor')
    await seat(world, assistant, s.vedamBatch1, 'ta')
    await seat(world, assistant, s.vedamBatch2, 'ta')

    expect(await activeSeats(world, teacher.id)).toHaveLength(2)
    expect(await activeSeats(world, assistant.id)).toHaveLength(2)
  })

  it.each(['break', 'dropped', 'inactive'] as const)(
    'does not count a %s enrollment as holding a seat',
    async status => {
      const s = await seedTwoCourses()
      world = s.w
      const student = await createProfile(world)

      await seat(world, student, s.vedamBatch1, 'student', status)
      await seat(world, student, s.vedamBatch2, 'student')

      expect(await activeSeats(world, student.id)).toHaveLength(1)
    },
  )

  it('rejects an enrollment whose course is not its batch’s course', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world)

    const error = await world.schoolDb
      .insert(enrollment)
      .values({
        profileId: student.id,
        batchId: s.vedamBatch1.id,
        courseId: s.smartam.id,
        role: 'student',
      })
      .catch((e: unknown) => e)

    expect(violation(error)).toEqual({
      code: '23503',
      constraint: 'enrollment_batchId_courseId_fk',
    })
  })

  it('rejects a batch whose course is not its track’s course', async () => {
    const s = await seedTwoCourses()
    world = s.w

    const error = await world.schoolDb
      .insert(batch)
      .values({ trackId: s.vedamTrack1.id, courseId: s.smartam.id, code: 'MISMATCH' })
      .catch((e: unknown) => e)

    expect(violation(error)).toEqual({ code: '23503', constraint: 'batch_trackId_courseId_fk' })
  })

  it('orders tracks within a course: two courses can each have a track 1, one course cannot have two', async () => {
    const s = await seedTwoCourses()
    world = s.w

    await createTrack(world, { course: s.vedam, order: 900 })
    await createTrack(world, { course: s.smartam, order: 900 })
    const error = await world.schoolDb
      .insert(track)
      .values({ courseId: s.vedam.id, name: 'Duplicate', order: 900 })
      .catch((e: unknown) => e)

    expect(violation(error)).toEqual({ code: '23505', constraint: 'track_courseId_order_uidx' })
  })
})

describe('seating a student through the service', () => {
  it('409s a second active seat in the same course, and leaves the first untouched', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world)
    await enroll(world.schoolDb, s.vedamBatch1.id, { profileId: student.id, role: 'student' })

    await expect(
      enroll(world.schoolDb, s.vedamBatch2.id, { profileId: student.id, role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect((await activeSeats(world, student.id)).map(e => e.batchId)).toEqual([s.vedamBatch1.id])
  })

  it('seats the student in another course’s batch without complaint', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world)
    await enroll(world.schoolDb, s.vedamBatch1.id, { profileId: student.id, role: 'student' })

    const row = await enroll(world.schoolDb, s.smartamBatch.id, {
      profileId: student.id,
      role: 'student',
    })

    expect(row.courseId).toBe(s.smartam.id)
  })

  it('404s for a batch that does not exist', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world)

    await expect(
      enroll(world.schoolDb, crypto.randomUUID(), { profileId: student.id, role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('takes a student back from a break, unless they have since joined another batch in the course', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world)
    await seat(world, student, s.vedamBatch1, 'student', 'break')

    // Nothing else active: resuming works.
    await expect(
      enroll(world.schoolDb, s.vedamBatch1.id, { profileId: student.id, role: 'student' }),
    ).resolves.toMatchObject({ status: 'active' })

    // Break again, join the other batch, and resuming the first is now refused.
    await world.schoolDb
      .update(enrollment)
      .set({ status: 'break' })
      .where(eq(enrollment.profileId, student.id))
    await enroll(world.schoolDb, s.vedamBatch2.id, { profileId: student.id, role: 'student' })

    await expect(
      enroll(world.schoolDb, s.vedamBatch1.id, { profileId: student.id, role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('moving a student between batches', () => {
  it('moves within a course: the old seat is released and the new one taken', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world)
    await seat(world, student, s.vedamBatch1, 'student')

    const moved = await moveEnrollment(
      world.schoolDb,
      s.vedamBatch1.id,
      s.vedamBatch2.id,
      student.id,
    )

    expect(moved).toMatchObject({
      batchId: s.vedamBatch2.id,
      courseId: s.vedam.id,
      status: 'active',
    })
    expect((await activeSeats(world, student.id)).map(e => e.batchId)).toEqual([s.vedamBatch2.id])
  })

  it('moves into another course, which takes that course’s seat', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world)
    await seat(world, student, s.vedamBatch1, 'student')

    const moved = await moveEnrollment(
      world.schoolDb,
      s.vedamBatch1.id,
      s.smartamBatch.id,
      student.id,
    )

    expect(moved.courseId).toBe(s.smartam.id)
  })

  it('409s and keeps the original seat when the destination course already has an active seat', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world)
    await seat(world, student, s.vedamBatch1, 'student')
    await seat(world, student, s.smartamBatch, 'student')

    // Vedam -> Smartam: the student already holds Smartam's seat.
    await expect(
      moveEnrollment(world.schoolDb, s.vedamBatch1.id, s.smartamBatch.id, student.id),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(await activeSeats(world, student.id)).toHaveLength(2)
  })
})

describe('asking to join a batch', () => {
  it('409s while the student holds an active seat in that course, but not in another course or on a break', async () => {
    const s = await seedTwoCourses()
    world = s.w
    const student = await createProfile(world, { yearOfBirth: 1990 })
    const evaluator = await createProfile(world, { name: 'Evaluator' })
    await seat(world, student, s.vedamBatch1, 'student')
    // vedamTrack2 gates on vedamTrack1 (the L1-minimum prerequisite, enrollmentRequests/
    // service.ts::request) — this test is about the one-seat-per-course conflict, not that gate,
    // so clear it up front with a passing result.
    const prereqExam = await createExam(world, {
      student,
      track: s.vedamTrack1,
      status: 'completed',
    })
    await createExamResult(world, { exam: prereqExam, evaluator })

    await expect(requestToJoin(world.schoolDb, s.vedamBatch2.id, student.id)).rejects.toMatchObject(
      {
        statusCode: 409,
      },
    )
    await expect(
      requestToJoin(world.schoolDb, s.smartamBatch.id, student.id),
    ).resolves.toMatchObject({
      status: 'pending',
    })

    // Off the seat (on a break) the same request is fine.
    await world.schoolDb
      .update(enrollment)
      .set({ status: 'break' })
      .where(eq(enrollment.batchId, s.vedamBatch1.id))
    await expect(
      requestToJoin(world.schoolDb, s.vedamBatch2.id, student.id),
    ).resolves.toMatchObject({
      status: 'pending',
    })
  })
})

describe('creating a batch', () => {
  it('takes the course from the track, whatever the request says', async () => {
    const s = await seedTwoCourses()
    world = s.w

    const teacher = await createProfile(world)
    const created = await createBatchViaService(
      { db: world.schoolDb },
      { trackId: s.smartamTrack.id, classifier: 'BR', instructorIds: [teacher.id] },
      s.smartam.slug,
    )

    expect(created.courseId).toBe(s.smartam.id)
    // The teacher is seated in the same transaction, in the batch's own course.
    const seats = await world.schoolDb.query.enrollment.findMany({ where: (t, { eq }) => eq(t.batchId, created.id) })
    expect(seats).toMatchObject([{ profileId: teacher.id, role: 'instructor', courseId: s.smartam.id }])
  })

  it('422s for a track that does not exist', async () => {
    const s = await seedTwoCourses()
    world = s.w

    await expect(
      createBatchViaService(
        { db: world.schoolDb },
        { trackId: crypto.randomUUID(), classifier: 'BR', instructorIds: [crypto.randomUUID()] },
        s.smartam.slug,
      ),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('the race: two seatings for one student at the same moment', () => {
  it('lets exactly one win, however the two requests interleave', async () => {
    const s = await seedTwoCourses()
    world = s.w

    // Fresh student each round, both seatings fired together on separate pool connections. Whether
    // Postgres happens to serialise a given pair or truly overlaps them, the invariant is the same:
    // one 200, one 409, one active seat.
    for (let round = 0; round < 12; round++) {
      const student = await createProfile(world)
      const results = await Promise.allSettled([
        enroll(world.schoolDb, s.vedamBatch1.id, { profileId: student.id, role: 'student' }),
        enroll(world.schoolDb, s.vedamBatch2.id, { profileId: student.id, role: 'student' }),
      ])

      const won = results.filter(r => r.status === 'fulfilled')
      const lost = results.filter(r => r.status === 'rejected')
      expect(won).toHaveLength(1)
      expect(lost).toHaveLength(1)
      expect((lost[0] as PromiseRejectedResult).reason).toMatchObject({ statusCode: 409 })
      expect(await activeSeats(world, student.id)).toHaveLength(1)
    }
  })
})

describe('resolveCourse', () => {
  it('finds a course by slug', async () => {
    const s = await seedTwoCourses()
    world = s.w

    await expect(resolveCourse(world.schoolDb, 'smartam')).resolves.toMatchObject({
      id: s.smartam.id,
    })
  })

  it('404s for a slug that is not a course', async () => {
    const s = await seedTwoCourses()
    world = s.w

    await expect(resolveCourse(world.schoolDb, 'nope')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('400s rather than guessing when none was named, however many courses the school has', async () => {
    const s = await seedTwoCourses()
    world = s.w

    await expect(resolveCourse(world.schoolDb, undefined)).rejects.toMatchObject({
      statusCode: 400,
    })
    await expect(resolveCourse(world.schoolDb, '')).rejects.toMatchObject({ statusCode: 400 })
  })
})
