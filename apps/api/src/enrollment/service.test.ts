import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDb, SchoolDbClient } from '@narada/db'

import { assertEnrolledInTrack, enroll, moveEnrollment, putOnBreak } from './service'
import * as repository from './repository'
import { DbConstraint } from '../utils/dbError'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findQualifyingBatches: vi.fn(),
  findEnrollment: vi.fn(),
  findBatchCourseId: vi.fn(),
  profileExists: vi.fn(),
  insertEnrollment: vi.fn(),
  reactivateEnrollment: vi.fn(),
  deleteEnrollment: vi.fn(),
  updateEnrollmentStatus: vi.fn(),
}))

describe('assertEnrolledInTrack', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('passes when the student is enrolled in one batch on the track', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([{ batchId: 'batch-1' }])

    await expect(assertEnrolledInTrack(db, 'student-1', 'track-1')).resolves.toBeUndefined()
    expect(repository.findQualifyingBatches).toHaveBeenCalledWith(db, 'student-1', 'track-1')
  })

  it('passes when the student is enrolled in several batches on the track', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([
      { batchId: 'batch-1' },
      { batchId: 'batch-2' },
    ])

    await expect(assertEnrolledInTrack(db, 'student-1', 'track-1')).resolves.toBeUndefined()
  })

  it('rejects with a 422 when the student has no batch on the track', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([])

    await expect(assertEnrolledInTrack(db, 'student-1', 'track-1')).rejects.toMatchObject({
      statusCode: 422,
      message: 'student is not enrolled in a batch for this track',
    })
  })
})

describe('enroll', () => {
  const db = {} as SchoolDb
  const seatViolation = {
    cause: { code: '23505', constraint: DbConstraint.enrollmentOneActiveSeatPerCourse },
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(repository.findBatchCourseId).mockResolvedValue('course-1')
  })

  it("seats the profile with the batch's own course, looked up rather than supplied by the caller", async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue(undefined)
    vi.mocked(repository.insertEnrollment).mockResolvedValue({} as never)

    await enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' })

    expect(repository.findBatchCourseId).toHaveBeenCalledWith(db, 'batch-1')
    expect(repository.insertEnrollment).toHaveBeenCalledWith(db, 'batch-1', 'course-1', {
      profileId: 'profile-1',
      role: 'student',
    })
  })

  it('rejects with 404 when the batch does not exist, without inserting', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findBatchCourseId).mockResolvedValue(undefined)

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.insertEnrollment).not.toHaveBeenCalled()
  })

  it('maps the one-active-seat-per-course index to a 409 when seating a student', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue(undefined)
    vi.mocked(repository.insertEnrollment).mockRejectedValue(seatViolation)

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('already has an active batch in this course'),
    })
  })

  it('takes the same 409 when putting a student back from a break after they joined another batch in the course', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'student', status: 'break' })
    vi.mocked(repository.reactivateEnrollment).mockRejectedValue(seatViolation)

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rethrows an unrelated database error unchanged', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue(undefined)
    const other = { cause: { code: '23503', constraint: 'some_other_fk' } }
    vi.mocked(repository.insertEnrollment).mockRejectedValue(other)

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).rejects.toBe(other)
  })

  it('adds the profile to the roster when it exists and is not already enrolled', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue(undefined)
    const row = {
      profileId: 'profile-1',
      batchId: 'batch-1',
      courseId: 'course-1',
      role: 'student' as const,
      status: 'active' as const,
      joinedAt: new Date(),
      leftDate: null,
    }
    vi.mocked(repository.insertEnrollment).mockResolvedValue(row)

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).resolves.toEqual(row)
  })

  it('rejects with 404 when the target profile does not exist', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(false)

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.insertEnrollment).not.toHaveBeenCalled()
  })

  it('rejects with 409 when the profile already holds an active enrollment in this batch', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'student', status: 'active' })

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(repository.insertEnrollment).not.toHaveBeenCalled()
  })

  it('reactivates, rather than conflicting, when the existing enrollment is on a break', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'student', status: 'break' })
    const row = {
      profileId: 'profile-1',
      batchId: 'batch-1',
      courseId: 'course-1',
      role: 'student' as const,
      status: 'active' as const,
      joinedAt: new Date(),
      leftDate: null,
    }
    vi.mocked(repository.reactivateEnrollment).mockResolvedValue(row)

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).resolves.toEqual(row)
    expect(repository.reactivateEnrollment).toHaveBeenCalledWith(db, 'batch-1', 'profile-1', 'student')
    expect(repository.insertEnrollment).not.toHaveBeenCalled()
  })
})

describe('putOnBreak', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('resolves when a row was updated to break', async () => {
    vi.mocked(repository.updateEnrollmentStatus).mockResolvedValue(true)

    await expect(putOnBreak(db, 'batch-1', 'profile-1')).resolves.toBeUndefined()
    expect(repository.updateEnrollmentStatus).toHaveBeenCalledWith(db, 'batch-1', 'profile-1', 'break')
  })

  it('rejects with 404 when there was no such enrollment to update', async () => {
    vi.mocked(repository.updateEnrollmentStatus).mockResolvedValue(false)

    await expect(putOnBreak(db, 'batch-1', 'profile-1')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('moveEnrollment', () => {
  // Stubs `transaction` to actually invoke the callback with a fake `tx`, mimicking real Drizzle
  // behavior — same pattern as batches/service.test.ts's `setClassSlots` suite.
  const tx = {}
  const transactionMock = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx))
  const db = { transaction: transactionMock } as unknown as SchoolDbClient

  beforeEach(() => {
    vi.resetAllMocks()
    transactionMock.mockImplementation(async callback => callback(tx))
    vi.mocked(repository.findBatchCourseId).mockResolvedValue('course-2')
  })

  it("releases the old seat before taking the new one, so a move within a course can't trip the one-seat rule against itself", async () => {
    vi.mocked(repository.findEnrollment)
      .mockResolvedValueOnce({ role: 'student', status: 'active' })
      .mockResolvedValueOnce(undefined)
    vi.mocked(repository.deleteEnrollment).mockResolvedValue(true)
    vi.mocked(repository.insertEnrollment).mockResolvedValue({} as never)

    await moveEnrollment(db, 'batch-1', 'batch-2', 'profile-1')

    expect(vi.mocked(repository.deleteEnrollment).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(repository.insertEnrollment).mock.invocationCallOrder[0]!,
    )
  })

  it('rejects with 404 when the destination batch does not exist, before releasing the old seat', async () => {
    vi.mocked(repository.findEnrollment)
      .mockResolvedValueOnce({ role: 'student', status: 'active' })
      .mockResolvedValueOnce(undefined)
    vi.mocked(repository.findBatchCourseId).mockResolvedValue(undefined)

    await expect(moveEnrollment(db, 'batch-1', 'batch-2', 'profile-1')).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(repository.deleteEnrollment).not.toHaveBeenCalled()
  })

  it('maps the seat rule to a 409 when the destination course already has an active seat for the student', async () => {
    vi.mocked(repository.findEnrollment)
      .mockResolvedValueOnce({ role: 'student', status: 'active' })
      .mockResolvedValueOnce(undefined)
    vi.mocked(repository.deleteEnrollment).mockResolvedValue(true)
    vi.mocked(repository.insertEnrollment).mockRejectedValue({
      cause: { code: '23505', constraint: DbConstraint.enrollmentOneActiveSeatPerCourse },
    })

    await expect(moveEnrollment(db, 'batch-1', 'batch-2', 'profile-1')).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('deletes the source enrollment and inserts one in the destination batch, preserving role', async () => {
    vi.mocked(repository.findEnrollment)
      .mockResolvedValueOnce({ role: 'student', status: 'active' }) // source lookup
      .mockResolvedValueOnce(undefined) // destination lookup
    vi.mocked(repository.deleteEnrollment).mockResolvedValue(true)
    const row = {
      profileId: 'profile-1',
      batchId: 'batch-2',
      courseId: 'course-2',
      role: 'student' as const,
      status: 'active' as const,
      joinedAt: new Date(),
      leftDate: null,
    }
    vi.mocked(repository.insertEnrollment).mockResolvedValue(row)

    await expect(moveEnrollment(db, 'batch-1', 'batch-2', 'profile-1')).resolves.toEqual(row)
    expect(repository.deleteEnrollment).toHaveBeenCalledWith(tx, 'batch-1', 'profile-1')
    expect(repository.insertEnrollment).toHaveBeenCalledWith(tx, 'batch-2', 'course-2', {
      profileId: 'profile-1',
      role: 'student',
    })
  })

  it('rejects with 404 when the profile is not enrolled in the source batch', async () => {
    vi.mocked(repository.findEnrollment).mockResolvedValue(undefined)

    await expect(moveEnrollment(db, 'batch-1', 'batch-2', 'profile-1')).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(repository.deleteEnrollment).not.toHaveBeenCalled()
  })

  it('rejects with 409 when already enrolled in the destination batch', async () => {
    vi.mocked(repository.findEnrollment)
      .mockResolvedValueOnce({ role: 'student', status: 'active' }) // source lookup
      .mockResolvedValueOnce({ role: 'student', status: 'active' }) // destination lookup
    vi.mocked(repository.deleteEnrollment).mockResolvedValue(true)

    await expect(moveEnrollment(db, 'batch-1', 'batch-2', 'profile-1')).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(repository.deleteEnrollment).not.toHaveBeenCalled()
  })

  it('rejects with 409 rather than moving when the source and destination batch are the same', async () => {
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'student', status: 'active' })

    await expect(moveEnrollment(db, 'batch-1', 'batch-1', 'profile-1')).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(repository.deleteEnrollment).not.toHaveBeenCalled()
  })
})
