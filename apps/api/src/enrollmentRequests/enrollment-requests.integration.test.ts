import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createEnrollmentRequest,
  createProfile,
  createTestSchool,
  createTrack,
  enroll as enrollFixture,
  type TestWorld,
} from '../testing/fixtures'
import { findEnrollment } from '../enrollment/repository'
import { approve, findAll, reject, request } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

const HOUR = 60 * 60 * 1000
const openWindow = { enrollmentOpensAt: new Date(Date.now() - HOUR), enrollmentClosesAt: new Date(Date.now() + HOUR) }

describe('request', () => {
  it('files a pending request without seating the student', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const student = await createProfile(world)

    const row = await request(world.schoolDb, batch.id, student.id)

    expect(row).toMatchObject({ profileId: student.id, batchId: batch.id, status: 'pending' })
    await expect(findEnrollment(world.schoolDb, student.id, batch.id)).resolves.toBeUndefined()
  })

  it('rejects with 404 for a nonexistent batch', async () => {
    world = await createTestSchool()
    const student = await createProfile(world)

    await expect(request(world.schoolDb, crypto.randomUUID(), student.id)).rejects.toMatchObject({
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

    await expect(request(world.schoolDb, batch.id, student.id)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects with 409 when already enrolled in this batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const student = await createProfile(world)
    await enrollFixture(world, student, batch, 'student')

    await expect(request(world.schoolDb, batch.id, student.id)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects with 409 when a request for this profile and batch is already pending', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const student = await createProfile(world)
    await request(world.schoolDb, batch.id, student.id)

    await expect(request(world.schoolDb, batch.id, student.id)).rejects.toMatchObject({
      statusCode: 409,
      message: 'a request to join this batch is already pending',
    })
  })

  it('allows a fresh request once an earlier one for the same profile and batch was rejected', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const student = await createProfile(world)
    const first = await request(world.schoolDb, batch.id, student.id)
    await reject({ db: world.schoolDb }, first.id, null)

    const row = await request(world.schoolDb, batch.id, student.id)

    expect(row.status).toBe('pending')
  })
})

describe('findAll', () => {
  it('filters by status and scopes to the given batchIds', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batchA = await createBatch(world, track, openWindow)
    const batchB = await createBatch(world, track, openWindow)
    const studentA = await createProfile(world)
    const studentB = await createProfile(world)
    const pendingInScope = await createEnrollmentRequest(world, studentA, batchA)
    await createEnrollmentRequest(world, studentB, batchB) // different batch, out of scope
    await createEnrollmentRequest(world, studentA, batchA, { status: 'approved' }) // wrong status

    const result = await findAll({ db: world.schoolDb }, { status: 'pending', limit: 20 }, [batchA.id])

    expect(result.items.map(item => item.id)).toEqual([pendingInScope.id])
    expect(result.items[0]).toMatchObject({ studentName: studentA.name, batchCode: batchA.code, trackName: track.name })
  })

  it('returns every batch when batchIds is null (school admin)', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batchA = await createBatch(world, track, openWindow)
    const batchB = await createBatch(world, track, openWindow)
    const studentA = await createProfile(world)
    const studentB = await createProfile(world)
    const first = await createEnrollmentRequest(world, studentA, batchA)
    const second = await createEnrollmentRequest(world, studentB, batchB)

    const result = await findAll({ db: world.schoolDb }, { status: 'pending', limit: 20 }, null)

    expect(result.items.map(item => item.id).sort()).toEqual([first.id, second.id].sort())
  })
})

describe('approve', () => {
  it('seats the student and transitions the request to approved', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const reviewer = await createProfile(world)
    const student = await createProfile(world)
    const pending = await createEnrollmentRequest(world, student, batch)

    const row = await approve({ db: world.schoolDb }, pending.id, reviewer.id)

    expect(row.status).toBe('approved')
    expect(row.reviewedBy).toBe(reviewer.id)
    expect(row.reviewedAt).not.toBeNull()
    await expect(findEnrollment(world.schoolDb, student.id, batch.id)).resolves.toEqual({
      role: 'student',
      status: 'active',
    })
  })

  it('rejects with 404 for a nonexistent request', async () => {
    world = await createTestSchool()

    await expect(approve({ db: world.schoolDb }, crypto.randomUUID(), null)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('rejects with 409 when the request was already reviewed', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const student = await createProfile(world)
    const alreadyApproved = await createEnrollmentRequest(world, student, batch, { status: 'approved' })

    await expect(approve({ db: world.schoolDb }, alreadyApproved.id, null)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('rejects with 409 rather than double-seating when the student is already actively enrolled', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const student = await createProfile(world)
    const pending = await createEnrollmentRequest(world, student, batch)
    await enrollFixture(world, student, batch, 'student')

    await expect(approve({ db: world.schoolDb }, pending.id, null)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('reject', () => {
  it('transitions the request to rejected without seating the student', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, openWindow)
    const student = await createProfile(world)
    const pending = await createEnrollmentRequest(world, student, batch)

    const row = await reject({ db: world.schoolDb }, pending.id, null)

    expect(row.status).toBe('rejected')
    expect(row.reviewedAt).not.toBeNull()
    await expect(findEnrollment(world.schoolDb, student.id, batch.id)).resolves.toBeUndefined()
  })
})
