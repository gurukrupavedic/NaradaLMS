import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createEnrollmentRequest,
  createExam,
  createExamResult,
  createProfile,
  createTestSchool,
  createTrack,
  enroll as enrollFixture,
  type TestWorld,
  defaultCourseId,
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

describe('request', () => {
  it('files a pending request without seating the student', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
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

  it('rejects with 409 when the batch has already completed', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track, { status: 'completed' })
    const student = await createProfile(world)

    await expect(request(world.schoolDb, batch.id, student.id)).rejects.toMatchObject({
      statusCode: 409,
      message: 'batch has already completed',
    })
  })

  it('rejects with 409 when already enrolled in this batch', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
    const student = await createProfile(world)
    await enrollFixture(world, student, batch, 'student')

    await expect(request(world.schoolDb, batch.id, student.id)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects with 409 when a request for this profile and batch is already pending', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
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
    const batch = await createBatch(world, track)
    const student = await createProfile(world)
    const first = await request(world.schoolDb, batch.id, student.id)
    await reject({ db: world.schoolDb }, first.id, null)

    const row = await request(world.schoolDb, batch.id, student.id)

    expect(row.status).toBe('pending')
  })

  it('rejects with 403 when the student has no result on the track before this one', async () => {
    world = await createTestSchool()
    const track1 = await createTrack(world, { order: 1 })
    const track2 = await createTrack(world, { order: 2 })
    await createBatch(world, track1)
    const batch2 = await createBatch(world, track2)
    const student = await createProfile(world)

    await expect(request(world.schoolDb, batch2.id, student.id)).rejects.toMatchObject({
      statusCode: 403,
      message: 'you need at least L1 in the previous track to join this batch',
    })
  })

  it('rejects with 403 when the only result on the track before this one is a reappear', async () => {
    world = await createTestSchool()
    const track1 = await createTrack(world, { order: 1 })
    const track2 = await createTrack(world, { order: 2 })
    const batch1 = await createBatch(world, track1)
    const batch2 = await createBatch(world, track2)
    const student = await createProfile(world)
    const evaluator = await createProfile(world, { name: 'Evaluator' })
    const failedExam = await createExam(world, { student, track: track1, batch: batch1, status: 'completed' })
    // Marks totalling 40 — below the 65 needed for `level1` — a `reappear` outcome.
    await createExamResult(world, {
      exam: failedExam,
      evaluator,
      marks: { aksharaShuddhi: 20, swaraShuddhi: 12, niyantranaAnargalata: 6, shraavyata: 1, pratishakyaGrammar: 1 },
    })

    await expect(request(world.schoolDb, batch2.id, student.id)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows the request once the student holds at least L1 on the track before this one', async () => {
    world = await createTestSchool()
    const track1 = await createTrack(world, { order: 1 })
    const track2 = await createTrack(world, { order: 2 })
    const batch1 = await createBatch(world, track1)
    const batch2 = await createBatch(world, track2)
    const student = await createProfile(world)
    const evaluator = await createProfile(world, { name: 'Evaluator' })
    const passedExam = await createExam(world, { student, track: track1, batch: batch1, status: 'completed' })
    // Marks totalling 70 (65-74 band) — a `level1` outcome, the minimum this gate requires.
    await createExamResult(world, {
      exam: passedExam,
      evaluator,
      marks: { aksharaShuddhi: 35, swaraShuddhi: 20, niyantranaAnargalata: 10, shraavyata: 3, pratishakyaGrammar: 2 },
    })

    const row = await request(world.schoolDb, batch2.id, student.id)

    expect(row.status).toBe('pending')
  })

  it('does not gate the course\'s first track', async () => {
    world = await createTestSchool()
    const track = await createTrack(world, { order: 1 })
    const batch = await createBatch(world, track)
    const student = await createProfile(world)

    const row = await request(world.schoolDb, batch.id, student.id)

    expect(row.status).toBe('pending')
  })
})

describe('findAll', () => {
  it('filters by status and scopes to the given batchIds', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batchA = await createBatch(world, track)
    const batchB = await createBatch(world, track)
    const studentA = await createProfile(world)
    const studentB = await createProfile(world)
    const pendingInScope = await createEnrollmentRequest(world, studentA, batchA)
    await createEnrollmentRequest(world, studentB, batchB) // different batch, out of scope
    await createEnrollmentRequest(world, studentA, batchA, { status: 'approved' }) // wrong status

    const result = await findAll({ db: world.schoolDb }, { status: 'pending', limit: 20 }, [batchA.id], await defaultCourseId(world))

    expect(result.items.map(item => item.id)).toEqual([pendingInScope.id])
    expect(result.items[0]).toMatchObject({ studentName: studentA.name, batchCode: batchA.code, trackName: track.name })
  })

  it('returns every batch when batchIds is null (school admin)', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batchA = await createBatch(world, track)
    const batchB = await createBatch(world, track)
    const studentA = await createProfile(world)
    const studentB = await createProfile(world)
    const first = await createEnrollmentRequest(world, studentA, batchA)
    const second = await createEnrollmentRequest(world, studentB, batchB)

    const result = await findAll({ db: world.schoolDb }, { status: 'pending', limit: 20 }, null, await defaultCourseId(world))

    expect(result.items.map(item => item.id).sort()).toEqual([first.id, second.id].sort())
  })
})

describe('approve', () => {
  it('seats the student and transitions the request to approved', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
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
    const batch = await createBatch(world, track)
    const student = await createProfile(world)
    const alreadyApproved = await createEnrollmentRequest(world, student, batch, { status: 'approved' })

    await expect(approve({ db: world.schoolDb }, alreadyApproved.id, null)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('rejects with 409 rather than double-seating when the student is already actively enrolled', async () => {
    world = await createTestSchool()
    const track = await createTrack(world)
    const batch = await createBatch(world, track)
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
    const batch = await createBatch(world, track)
    const student = await createProfile(world)
    const pending = await createEnrollmentRequest(world, student, batch)

    const row = await reject({ db: world.schoolDb }, pending.id, null)

    expect(row.status).toBe('rejected')
    expect(row.reviewedAt).not.toBeNull()
    await expect(findEnrollment(world.schoolDb, student.id, batch.id)).resolves.toBeUndefined()
  })
})
