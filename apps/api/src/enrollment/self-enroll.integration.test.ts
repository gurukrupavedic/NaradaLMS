import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createProfile,
  createTestSchool,
  createTrack,
  enroll as enrollFixture,
  type TestWorld,
} from '../testing/fixtures'
import { findEnrollment } from './repository'
import { selfEnroll } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

const HOUR = 60 * 60 * 1000
const openWindow = { enrollmentOpensAt: new Date(Date.now() - HOUR), enrollmentClosesAt: new Date(Date.now() + HOUR) }

describe('selfEnroll', () => {
  it('enrolls the profile as an active student', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const student = await createProfile(world)

    const row = await selfEnroll(world.schoolDb, batch.id, student.id)

    expect(row).toMatchObject({ profileId: student.id, batchId: batch.id, role: 'student', status: 'active' })
    await expect(findEnrollment(world.schoolDb, student.id, batch.id)).resolves.toEqual({
      role: 'student',
      status: 'active',
    })
  })

  it('rejects with 404 for a nonexistent batch', async () => {
    world = await createTestSchool()
    const student = await createProfile(world)

    await expect(selfEnroll(world.schoolDb, crypto.randomUUID(), student.id)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('rejects with 409 when the enrollment window has not opened yet', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, {
      enrollmentOpensAt: new Date(Date.now() + HOUR),
      enrollmentClosesAt: new Date(Date.now() + 2 * HOUR),
    })
    const student = await createProfile(world)

    await expect(selfEnroll(world.schoolDb, batch.id, student.id)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects with 409 when the enrollment window has already closed', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, {
      enrollmentOpensAt: new Date(Date.now() - 2 * HOUR),
      enrollmentClosesAt: new Date(Date.now() - HOUR),
    })
    const student = await createProfile(world)

    await expect(selfEnroll(world.schoolDb, batch.id, student.id)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('enrolls when the window is open-ended (opened in the past, no scheduled close)', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, {
      enrollmentOpensAt: new Date(Date.now() - HOUR),
      enrollmentClosesAt: null,
    })
    const student = await createProfile(world)

    const row = await selfEnroll(world.schoolDb, batch.id, student.id)

    expect(row).toMatchObject({ profileId: student.id, batchId: batch.id, role: 'student' })
  })

  it('rejects with 409 when no enrollment window was ever set', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
    const student = await createProfile(world)

    await expect(selfEnroll(world.schoolDb, batch.id, student.id)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects with 409 when already enrolled in this batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const student = await createProfile(world)
    await enrollFixture(world, student, batch, 'student')

    await expect(selfEnroll(world.schoolDb, batch.id, student.id)).rejects.toMatchObject({ statusCode: 409 })
  })

  // The real reason `findByIdForUpdate` locks the batch row rather than just checking-then-
  // inserting: two racing calls for the *same* profile must not both pass the "not already
  // enrolled" check before either commits — otherwise the loser would hit a raw `enrollment`
  // primary-key violation instead of a clean 409. Real concurrent connections against real
  // Postgres, not a mocked transaction — the guarantee being tested is the database's own row
  // lock, not application code.
  it('under real concurrency, exactly one of two racing self-enroll calls for the same profile wins', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const student = await createProfile(world)

    const results = await Promise.allSettled([
      selfEnroll(world.schoolDb, batch.id, student.id),
      selfEnroll(world.schoolDb, batch.id, student.id),
    ])

    const fulfilled = results.filter(r => r.status === 'fulfilled')
    const rejected = results.filter(r => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ statusCode: 409 })
  })
})
