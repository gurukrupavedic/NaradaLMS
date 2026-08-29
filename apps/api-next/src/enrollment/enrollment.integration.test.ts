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
import { enroll, unenroll } from './service'
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
        profileId: studentProfile.id,
        role: 'student',
      }),
    ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')
  })
})

describe('unenroll', () => {
  it('removes an existing enrollment', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const studentProfile = await createProfile(world)
    await enrollFixture(world, studentProfile, batchRow, 'student')

    await unenroll(world.schoolDb, batchRow.id, studentProfile.id)

    await expect(
      findEnrollment(world.schoolDb, studentProfile.id, batchRow.id),
    ).resolves.toBeUndefined()
  })

  it('rejects with 404 when there is no such enrollment', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const studentProfile = await createProfile(world)

    await expect(
      unenroll(world.schoolDb, batchRow.id, studentProfile.id),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('only removes the targeted (batchId, profileId) pair, not the profile\'s other enrollments', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchA = await createBatch(world, trackRow)
    const batchB = await createBatch(world, trackRow)
    const studentProfile = await createProfile(world)
    await enrollFixture(world, studentProfile, batchA, 'student')
    await enrollFixture(world, studentProfile, batchB, 'student')

    await unenroll(world.schoolDb, batchA.id, studentProfile.id)

    await expect(
      findEnrollment(world.schoolDb, studentProfile.id, batchA.id),
    ).resolves.toBeUndefined()
    await expect(
      findEnrollment(world.schoolDb, studentProfile.id, batchB.id),
    ).resolves.toEqual({ role: 'student' })
  })
})
