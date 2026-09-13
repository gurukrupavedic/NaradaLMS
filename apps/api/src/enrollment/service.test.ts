import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDb, SchoolDbClient } from '@narada/db'

import { assertStudentEnrolledInBatch, enroll, resolveQualifyingBatch, selfEnroll, unenroll } from './service'
import * as repository from './repository'
import * as batchesRepository from '../batches/repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findQualifyingBatches: vi.fn(),
  findEnrollment: vi.fn(),
  profileExists: vi.fn(),
  insertEnrollment: vi.fn(),
  deleteEnrollment: vi.fn(),
  countActiveStudentEnrollments: vi.fn(),
}))

// Same reasoning as the `./repository` mock above — `selfEnroll` is the one function here that
// also reaches into `../batches/repository` (to lock and read the batch row).
vi.mock('../batches/repository', () => ({
  findByIdForUpdate: vi.fn(),
}))

describe('resolveQualifyingBatch', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the batchId when exactly one batch qualifies', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([{ batchId: 'batch-1' }])

    await expect(resolveQualifyingBatch(db, 'student-1', 'track-1')).resolves.toBe('batch-1')
    expect(repository.findQualifyingBatches).toHaveBeenCalledWith(db, 'student-1', 'track-1')
  })

  it('rejects with a 422 when no batch qualifies', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([])

    await expect(resolveQualifyingBatch(db, 'student-1', 'track-1')).rejects.toMatchObject({
      statusCode: 422,
      message: 'student is not enrolled in a batch for this chapter',
    })
  })

  it('rejects with a 422 when more than one batch qualifies, rather than silently picking one', async () => {
    vi.mocked(repository.findQualifyingBatches).mockResolvedValue([
      { batchId: 'batch-1' },
      { batchId: 'batch-2' },
    ])

    await expect(resolveQualifyingBatch(db, 'student-1', 'track-1')).rejects.toMatchObject({
      statusCode: 422,
      message: "student is enrolled in multiple batches for this chapter's track",
    })
  })
})

describe('assertStudentEnrolledInBatch', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('resolves when the target holds a student enrollment in this exact batch', async () => {
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'student' })

    await expect(
      assertStudentEnrolledInBatch(db, 'student-1', 'batch-1'),
    ).resolves.toBeUndefined()
    expect(repository.findEnrollment).toHaveBeenCalledWith(db, 'student-1', 'batch-1')
  })

  it('rejects with a 422 when there is no enrollment in this batch at all', async () => {
    vi.mocked(repository.findEnrollment).mockResolvedValue(undefined)

    await expect(
      assertStudentEnrolledInBatch(db, 'student-1', 'batch-1'),
    ).rejects.toMatchObject({ statusCode: 422, message: 'student is not enrolled in this batch' })
  })

  it('rejects with a 422 when the target is enrolled in this batch as instructor/ta, not student', async () => {
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'instructor' })

    await expect(
      assertStudentEnrolledInBatch(db, 'student-1', 'batch-1'),
    ).rejects.toMatchObject({ statusCode: 422, message: 'student is not enrolled in this batch' })
  })
})

describe('enroll', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('adds the profile to the roster when it exists and is not already enrolled', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue(undefined)
    const row = {
      profileId: 'profile-1',
      batchId: 'batch-1',
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

  it('rejects with 409 when the profile is already enrolled in this batch', async () => {
    vi.mocked(repository.profileExists).mockResolvedValue(true)
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'student' })

    await expect(
      enroll(db, 'batch-1', { profileId: 'profile-1', role: 'student' }),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(repository.insertEnrollment).not.toHaveBeenCalled()
  })
})

describe('unenroll', () => {
  const db = {} as SchoolDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('resolves when a row was deleted', async () => {
    vi.mocked(repository.deleteEnrollment).mockResolvedValue(true)

    await expect(unenroll(db, 'batch-1', 'profile-1')).resolves.toBeUndefined()
  })

  it('rejects with 404 when there was no such enrollment to delete', async () => {
    vi.mocked(repository.deleteEnrollment).mockResolvedValue(false)

    await expect(unenroll(db, 'batch-1', 'profile-1')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('selfEnroll', () => {
  // Stubs `transaction` to actually invoke the callback with a fake `tx`, mimicking real Drizzle
  // behavior — same pattern as batches/service.test.ts's `setClassSlots` suite.
  const tx = {}
  const transactionMock = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx))
  const db = { transaction: transactionMock } as unknown as SchoolDbClient

  const openBatch = {
    id: 'batch-1',
    trackId: 'track-1',
    code: 'B1',
    status: 'active' as const,
    startDate: null,
    meetingUrl: null,
    enrollmentOpensAt: new Date('2026-01-01T00:00:00Z'),
    enrollmentClosesAt: new Date('2026-12-31T00:00:00Z'),
    capacity: null,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    transactionMock.mockImplementation(async callback => callback(tx))
    vi.mocked(repository.findEnrollment).mockResolvedValue(undefined)
    vi.mocked(repository.countActiveStudentEnrollments).mockResolvedValue(new Map())
  })

  it('enrolls the profile as a student when the batch is open and has room', async () => {
    vi.mocked(batchesRepository.findByIdForUpdate).mockResolvedValue(openBatch)
    const row = {
      profileId: 'profile-1',
      batchId: 'batch-1',
      role: 'student' as const,
      status: 'active' as const,
      joinedAt: new Date(),
      leftDate: null,
    }
    vi.mocked(repository.insertEnrollment).mockResolvedValue(row)

    await expect(selfEnroll(db, 'batch-1', 'profile-1')).resolves.toEqual(row)
    expect(batchesRepository.findByIdForUpdate).toHaveBeenCalledWith(tx, 'batch-1')
    expect(repository.insertEnrollment).toHaveBeenCalledWith(tx, 'batch-1', {
      profileId: 'profile-1',
      role: 'student',
    })
  })

  it('rejects with 404 when the batch does not exist', async () => {
    vi.mocked(batchesRepository.findByIdForUpdate).mockResolvedValue(undefined)

    await expect(selfEnroll(db, 'batch-1', 'profile-1')).rejects.toMatchObject({ statusCode: 404 })
    expect(repository.insertEnrollment).not.toHaveBeenCalled()
  })

  it('rejects with 409 when the enrollment window has not opened yet', async () => {
    vi.mocked(batchesRepository.findByIdForUpdate).mockResolvedValue({
      ...openBatch,
      enrollmentOpensAt: new Date('2099-01-01T00:00:00Z'),
    })

    await expect(selfEnroll(db, 'batch-1', 'profile-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'batch is not currently open for enrollment',
    })
  })

  it('rejects with 409 when the enrollment window has already closed', async () => {
    vi.mocked(batchesRepository.findByIdForUpdate).mockResolvedValue({
      ...openBatch,
      enrollmentClosesAt: new Date('2020-01-01T00:00:00Z'),
    })

    await expect(selfEnroll(db, 'batch-1', 'profile-1')).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects with 409 when no enrollment window was ever set', async () => {
    vi.mocked(batchesRepository.findByIdForUpdate).mockResolvedValue({
      ...openBatch,
      enrollmentOpensAt: null,
      enrollmentClosesAt: null,
    })

    await expect(selfEnroll(db, 'batch-1', 'profile-1')).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects with 409 when already enrolled in this batch', async () => {
    vi.mocked(batchesRepository.findByIdForUpdate).mockResolvedValue(openBatch)
    vi.mocked(repository.findEnrollment).mockResolvedValue({ role: 'student' })

    await expect(selfEnroll(db, 'batch-1', 'profile-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'already enrolled in this batch',
    })
    expect(repository.insertEnrollment).not.toHaveBeenCalled()
  })

  it('rejects with 409 when the batch is at capacity', async () => {
    vi.mocked(batchesRepository.findByIdForUpdate).mockResolvedValue({ ...openBatch, capacity: 2 })
    vi.mocked(repository.countActiveStudentEnrollments).mockResolvedValue(new Map([['batch-1', 2]]))

    await expect(selfEnroll(db, 'batch-1', 'profile-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'batch is full',
    })
    expect(repository.insertEnrollment).not.toHaveBeenCalled()
  })

  it('enrolls when under capacity', async () => {
    vi.mocked(batchesRepository.findByIdForUpdate).mockResolvedValue({ ...openBatch, capacity: 2 })
    vi.mocked(repository.countActiveStudentEnrollments).mockResolvedValue(new Map([['batch-1', 1]]))
    vi.mocked(repository.insertEnrollment).mockResolvedValue({
      profileId: 'profile-1',
      batchId: 'batch-1',
      role: 'student',
      status: 'active',
      joinedAt: new Date(),
      leftDate: null,
    })

    await expect(selfEnroll(db, 'batch-1', 'profile-1')).resolves.toMatchObject({ profileId: 'profile-1' })
  })
})
