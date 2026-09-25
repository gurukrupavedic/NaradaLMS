import { afterEach, describe, expect, it } from 'vitest'

import { enrollment } from '@narada/db'

import { destroyTestWorld } from '../testing/cleanup'
import { pgErrorCode } from '../testing/concurrency'
import {
  createBatch,
  createProfile,
  createTestSchool,
  createTrack,
  enroll as enrollFixture,
  type TestWorld,
} from '../testing/fixtures'
import { enroll, hasSharedInstructorEnrollment } from './service'
import { findEnrollment } from './repository'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('enroll', () => {
  it('adds a profile to a batch roster and it is then findable', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const studentProfile = await createProfile(world)

    const row = await enroll(world.schoolDb, batchRow.id, {
      profileId: studentProfile.id,
      role: 'student',
    })

    expect(row.profileId).toBe(studentProfile.id)
    expect(row.role).toBe('student')
    await expect(findEnrollment(world.schoolDb, studentProfile.id, batchRow.id)).resolves.toEqual({
      role: 'student',
      status: 'active',
    })
  })

  it('enrolls a profile as a ta, and the same profile can hold an active student seat in another batch at once', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const teachingBatch = await createBatch(world, trackRow)
    const learningBatch = await createBatch(world, trackRow)
    const profile = await createProfile(world)

    const taEnrollment = await enroll(world.schoolDb, teachingBatch.id, {
      profileId: profile.id,
      role: 'ta',
    })
    expect(taEnrollment.role).toBe('ta')

    // A ta seat doesn't count against the one-active-student-seat-per-course limit — the same
    // profile can also hold a real student seat elsewhere in the same course.
    const studentEnrollment = await enroll(world.schoolDb, learningBatch.id, {
      profileId: profile.id,
      role: 'student',
    })
    expect(studentEnrollment.role).toBe('student')

    await expect(findEnrollment(world.schoolDb, profile.id, teachingBatch.id)).resolves.toEqual({
      role: 'ta',
      status: 'active',
    })
    await expect(findEnrollment(world.schoolDb, profile.id, learningBatch.id)).resolves.toEqual({
      role: 'student',
      status: 'active',
    })
  })

  it('rejects with 404 when the target profile does not exist', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)

    await expect(
      enroll(world.schoolDb, batchRow.id, { profileId: crypto.randomUUID(), role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects with 409 when the profile is already enrolled in this batch', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const studentProfile = await createProfile(world)
    await enrollFixture(world, studentProfile, batchRow, 'student')

    await expect(
      enroll(world.schoolDb, batchRow.id, { profileId: studentProfile.id, role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('raises a real FK violation for a nonexistent batchId (defense in depth beyond the service precheck)', async () => {
    world = await createTestSchool()
    const studentProfile = await createProfile(world)

    await expect(
      world.schoolDb.insert(enrollment).values({
        batchId: crypto.randomUUID(),
        courseId: crypto.randomUUID(),
        profileId: studentProfile.id,
        role: 'student',
      }),
    ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')
  })
})

// Backs AccessPolicy.getProfileBatchListScope's "you've taught this student, so you can see
// their full history" rule — a §1.1-scrutiny authorization decision, not cosmetic, so it gets
// real-database coverage, not just the mocked unit tests in accessPolicy.test.ts.
describe('hasSharedInstructorEnrollment', () => {
  it('true when the instructor currently teaches a batch the student is also enrolled in', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const instructorProfile = await createProfile(world)
    const studentProfile = await createProfile(world)
    await enrollFixture(world, instructorProfile, batchRow, 'instructor')
    await enrollFixture(world, studentProfile, batchRow, 'student')

    await expect(
      hasSharedInstructorEnrollment(world.schoolDb, instructorProfile.id, studentProfile.id),
    ).resolves.toBe(true)
  })

  it('true for a TA, not just an instructor', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const taProfile = await createProfile(world)
    const studentProfile = await createProfile(world)
    await enrollFixture(world, taProfile, batchRow, 'ta')
    await enrollFixture(world, studentProfile, batchRow, 'student')

    await expect(
      hasSharedInstructorEnrollment(world.schoolDb, taProfile.id, studentProfile.id),
    ).resolves.toBe(true)
  })

  it('false when the two profiles have never shared a batch', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchA = await createBatch(world, trackRow)
    const batchB = await createBatch(world, trackRow)
    const instructorProfile = await createProfile(world)
    const studentProfile = await createProfile(world)
    await enrollFixture(world, instructorProfile, batchA, 'instructor')
    await enrollFixture(world, studentProfile, batchB, 'student')

    await expect(
      hasSharedInstructorEnrollment(world.schoolDb, instructorProfile.id, studentProfile.id),
    ).resolves.toBe(false)
  })

  it('false when the shared enrollment exists but the actor is a student there too, not an instructor/ta', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const actorProfile = await createProfile(world)
    const studentProfile = await createProfile(world)
    await enrollFixture(world, actorProfile, batchRow, 'student')
    await enrollFixture(world, studentProfile, batchRow, 'student')

    await expect(
      hasSharedInstructorEnrollment(world.schoolDb, actorProfile.id, studentProfile.id),
    ).resolves.toBe(false)
  })
})
